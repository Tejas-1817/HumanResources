#!/usr/bin/env python3
"""
Migration: Ensure all JobRoles have proper pipeline_stages for Interview/Interviewed stages.

This script:
1. Identifies JobRoles with NULL or incomplete pipeline_stages
2. Sets them to the complete standard pipeline with all stages
3. Ensures Interview/Interviewed transitions work for all roles

Run this ONCE to fix existing data:
  cd backend && python migrate_fix_pipeline_stages.py
"""

import sys
import os
import json

# Add the parent directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import text
from app.database.session import engine

# Standard pipeline stages that should be available for ALL roles
STANDARD_PIPELINE_STAGES = [
    {"id": "pending", "title": "Pending", "color": "bg-slate-400", "bgGlow": "from-slate-400/10"},
    {"id": "shortlisted", "title": "Shortlisted", "color": "bg-primary", "bgGlow": "from-primary/10"},
    {"id": "interview_scheduled", "title": "Interview Scheduled", "color": "bg-amber-500", "bgGlow": "from-amber-500/10"},
    {"id": "interviewed", "title": "Interviewed", "color": "bg-orange-500", "bgGlow": "from-orange-500/10"},
    {"id": "on_hold", "title": "On Hold", "color": "bg-orange-400", "bgGlow": "from-orange-400/10"},
    {"id": "rejected", "title": "Rejected", "color": "bg-destructive", "bgGlow": "from-destructive/10"},
    {"id": "selected", "title": "Selected", "color": "bg-emerald-500", "bgGlow": "from-emerald-500/10"},
    {"id": "dropped", "title": "Dropped", "color": "bg-zinc-400", "bgGlow": "from-zinc-400/10"},
]


def migrate():
    print("=" * 80)
    print("Migration: Fixing pipeline_stages for all JobRoles")
    print("=" * 80)
    
    try:
        with engine.connect() as conn:
            # Step 1: Check if pipeline_stages column exists
            print("\n[Step 1] Checking if pipeline_stages column exists...")
            result = conn.execute(text("SHOW COLUMNS FROM job_roles LIKE 'pipeline_stages'"))
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                print("  ERROR: Column 'pipeline_stages' does not exist!")
                print("  Please run migrate_stages.py first to add the column.")
                return False
            
            print("  ✓ Column exists")
            
            # Step 2: Find JobRoles with NULL pipeline_stages
            print("\n[Step 2] Finding JobRoles with NULL pipeline_stages...")
            result = conn.execute(text(
                "SELECT id, title FROM job_roles WHERE pipeline_stages IS NULL"
            ))
            null_roles = result.fetchall()
            print(f"  Found {len(null_roles)} JobRoles with NULL pipeline_stages")
            
            if null_roles:
                print("  Roles to update:")
                for role_id, title in null_roles:
                    print(f"    - ID {role_id}: {title}")
            
            # Step 3: Find JobRoles with incomplete pipeline_stages
            print("\n[Step 3] Finding JobRoles with incomplete pipeline_stages...")
            result = conn.execute(text(
                "SELECT id, title, pipeline_stages FROM job_roles WHERE pipeline_stages IS NOT NULL"
            ))
            all_roles_with_stages = result.fetchall()
            
            incomplete_roles = []
            standard_stage_ids = {stage["id"] for stage in STANDARD_PIPELINE_STAGES}
            
            for role_id, title, stages_json in all_roles_with_stages:
                try:
                    if isinstance(stages_json, str):
                        stages = json.loads(stages_json)
                    else:
                        stages = stages_json
                    
                    stage_ids = {stage.get("id", "").lower() for stage in stages if isinstance(stage, dict)}
                    
                    # Check if missing any standard stages
                    missing = standard_stage_ids - stage_ids
                    if missing:
                        incomplete_roles.append((role_id, title, missing))
                        print(f"    - ID {role_id}: {title}")
                        print(f"      Missing stages: {', '.join(sorted(missing))}")
                except Exception as e:
                    print(f"    - ID {role_id}: ERROR parsing stages - {e}")
            
            if incomplete_roles:
                print(f"  Found {len(incomplete_roles)} JobRoles with incomplete stages")
            else:
                print("  All existing pipeline_stages are complete")
            
            # Step 4: Update all NULL roles to have standard stages
            print("\n[Step 4] Updating JobRoles...")
            stages_json = json.dumps(STANDARD_PIPELINE_STAGES)
            
            if null_roles:
                print(f"  Setting {len(null_roles)} NULL roles to standard pipeline...")
                conn.execute(text(
                    "UPDATE job_roles SET pipeline_stages = :stages WHERE pipeline_stages IS NULL"
                ), {"stages": stages_json})
                print(f"  ✓ Updated {len(null_roles)} roles")
            
            # Step 5: Update incomplete roles
            if incomplete_roles:
                print(f"  Setting {len(incomplete_roles)} incomplete roles to standard pipeline...")
                for role_id, title, missing in incomplete_roles:
                    print(f"    - Updating ID {role_id}: {title}")
                
                # Update all incomplete roles at once
                conn.execute(text(
                    "UPDATE job_roles SET pipeline_stages = :stages WHERE pipeline_stages IS NOT NULL AND id IN ("
                    + ",".join(str(r[0]) for r in incomplete_roles) + ")"
                ), {"stages": stages_json})
                print(f"  ✓ Updated {len(incomplete_roles)} roles")
            
            # Commit the changes
            conn.commit()
            print("\n[Step 5] Committing changes...")
            print("  ✓ All changes committed")
            
            # Verify the changes
            print("\n[Step 6] Verifying changes...")
            result = conn.execute(text(
                "SELECT COUNT(*) as count FROM job_roles WHERE pipeline_stages IS NULL"
            ))
            null_count = result.fetchone()[0]
            
            if null_count > 0:
                print(f"  WARNING: {null_count} roles still have NULL pipeline_stages")
                return False
            else:
                print("  ✓ All JobRoles now have pipeline_stages set")
            
            print("\n" + "=" * 80)
            print("✓ Migration completed successfully!")
            print("=" * 80)
            print("\nAll JobRoles now support these pipeline stages:")
            for stage in STANDARD_PIPELINE_STAGES:
                print(f"  - {stage['id']}: {stage['title']}")
            print("\nInterview and Interviewed transitions are now available for all roles.")
            return True
            
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
