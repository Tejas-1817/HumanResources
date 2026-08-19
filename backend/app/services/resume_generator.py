import os
import html
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_candidate_pdf(candidate, target_path: Path) -> Path:
    """Generate a clean, professional PDF resume for a candidate using ReportLab."""
    try:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(str(target_path.parent), 0o755)
        except Exception:
            pass
    except Exception:
        pass
    
    doc = SimpleDocTemplate(
        str(target_path),
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    
    styles = getSampleStyleSheet()
    
    name_style = ParagraphStyle(
        'CandidateName',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=2,
    )
    
    subtitle_style = ParagraphStyle(
        'CandidateSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=4,
    )
    
    contact_style = ParagraphStyle(
        'ContactInfo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=10,
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=4,
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )
    
    skill_style = ParagraphStyle(
        'SkillPill',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#3730A3'),
    )

    story = []
    
    name = getattr(candidate, 'name', None) or 'Candidate Profile'
    email = getattr(candidate, 'email', None) or ''
    phone = getattr(candidate, 'phone', None) or ''
    experience_years = getattr(candidate, 'experience_years', 0) or 0
    skills_raw = getattr(candidate, 'skills', '') or ''
    source = getattr(candidate, 'source', '') or ''
    consultancy = getattr(candidate, 'consultancy_name', '') or ''
    raw_text = getattr(candidate, 'raw_text', '') or ''

    # Header
    story.append(Paragraph(html.escape(name), name_style))
    
    exp_text = f"{experience_years} Years of Experience" if experience_years else "Professional Profile"
    story.append(Paragraph(html.escape(exp_text), subtitle_style))
    
    contact_parts = []
    if email:
        contact_parts.append(f"Email: {html.escape(email)}")
    if phone:
        contact_parts.append(f"Phone: {html.escape(phone)}")
    if source:
        contact_parts.append(f"Source: {html.escape(source.capitalize())}")
    if consultancy:
        contact_parts.append(f"Agency: {html.escape(consultancy)}")
        
    if contact_parts:
        story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), contact_style))
        
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4F46E5"), spaceBefore=2, spaceAfter=12))

    # Professional Summary
    story.append(Paragraph("PROFESSIONAL SUMMARY", section_heading))
    summary_text = (
        f"{name} is an experienced professional with {experience_years} years of background in software engineering and technology solutions. "
        f"Demonstrated competence across core domains, problem solving, system architecture, and collaborative team delivery."
    )
    story.append(Paragraph(html.escape(summary_text), body_style))
    story.append(Spacer(1, 8))

    # Skills Section
    skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
    if skills_list:
        story.append(Paragraph("CORE SKILLS & TECHNOLOGIES", section_heading))
        
        skill_rows = []
        row = []
        for s in skills_list:
            pill = Paragraph(f"• {html.escape(s)}", body_style)
            row.append(pill)
            if len(row) == 3:
                skill_rows.append(row)
                row = []
        if row:
            while len(row) < 3:
                row.append(Paragraph("", body_style))
            skill_rows.append(row)
            
        skills_table = Table(skill_rows, colWidths=[175, 175, 175])
        skills_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(skills_table)
        story.append(Spacer(1, 10))

    # Detailed Background / Experience
    story.append(Paragraph("EXPERIENCE & PROFILE DETAILS", section_heading))
    
    if raw_text and len(raw_text.strip()) > 30:
        clean_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        for line in clean_lines[:40]:  # Up to 40 lines
            story.append(Paragraph(html.escape(line), body_style))
    else:
        details = [
            f"• <b>Total Relevant Experience:</b> {experience_years} Years",
            f"• <b>Key Technical Competencies:</b> {html.escape(skills_raw or 'Full Stack Development, Systems Engineering')}",
            f"• <b>Sourcing Pipeline:</b> {html.escape(source.capitalize() if source else 'Direct Upload')}",
        ]
        if consultancy:
            details.append(f"• <b>Representing Consultancy / Partner:</b> {html.escape(consultancy)}")
        for d in details:
            story.append(Paragraph(d, body_style))
            
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceBefore=6, spaceAfter=8))
    
    footer_text = f"ResumeIQ Verified Candidate Document • ID: #{getattr(candidate, 'id', 'N/A')} • {name}"
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#94A3B8'),
        alignment=1,  # Center
    )
    story.append(Paragraph(html.escape(footer_text), footer_style))

    doc.build(story)
    return target_path
