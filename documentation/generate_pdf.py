import os
import re
import sys

def markdown_to_html(md_content):
    """
    A simple, robust Markdown parser that converts Project_Documentation.md
    into clean, beautifully styled HTML structure.
    """
    html_lines = []
    in_list = False
    in_table = False
    
    # CSS styling for a highly premium corporate PDF layout
    css_styles = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.65;
            color: #1e293b;
            max-width: 850px;
            margin: 0 auto;
            padding: 40px;
            background-color: #ffffff;
        }

        h1, h2, h3, h4 {
            color: #0f172a;
            font-weight: 700;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }

        h1 {
            font-size: 2.2rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }

        h2 {
            font-size: 1.6rem;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            color: #1e3a8a;
        }

        h3 {
            font-size: 1.25rem;
            color: #2563eb;
        }

        p {
            margin-bottom: 1.25em;
            font-size: 1.05rem;
        }

        ul, ol {
            margin-bottom: 1.5em;
            padding-left: 24px;
        }

        li {
            margin-bottom: 0.5em;
            font-size: 1.05rem;
        }

        strong {
            font-weight: 600;
            color: #0f172a;
        }

        code {
            font-family: Consolas, Monaco, "Andale Mono", monospace;
            background-color: #f1f5f9;
            color: #b91c1c;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        pre {
            background-color: #0f172a;
            color: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 1.5em;
        }

        pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
            font-size: 0.95em;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2em;
            margin-top: 1em;
            font-size: 1rem;
        }

        th, td {
            padding: 12px 16px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }

        th {
            background-color: #f8fafc;
            color: #0f172a;
            font-weight: 600;
        }

        tr:nth-child(even) {
            background-color: #f8fafc;
        }

        hr {
            border: 0;
            height: 1px;
            background: #cbd5e1;
            margin: 2.5em 0;
        }

        /* Cover Page Styling */
        .cover-page {
            height: 95vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            border: 1px solid #e2e8f0;
            padding: 60px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
            margin-bottom: 100px;
            page-break-after: always;
        }

        .cover-logo {
            font-size: 3rem;
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 20px;
            letter-spacing: -0.05em;
        }

        .cover-subtitle {
            font-size: 1.5rem;
            color: #475569;
            margin-bottom: 60px;
            font-weight: 300;
        }

        .cover-details {
            border-top: 2px solid #3b82f6;
            padding-top: 30px;
            width: 100%;
            max-width: 500px;
            text-align: left;
        }

        .cover-details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 1.1rem;
        }

        .cover-details-label {
            font-weight: 600;
            color: #475569;
        }

        .cover-details-value {
            color: #0f172a;
            font-weight: 500;
        }

        /* Print formatting */
        @media print {
            body {
                padding: 0;
            }
            .cover-page {
                box-shadow: none;
                border: none;
                height: 100%;
            }
            .page-break {
                page-break-after: always;
            }
        }
    </style>
    """

    html_lines.append("<!DOCTYPE html>")
    html_lines.append("<html>")
    html_lines.append("<head>")
    html_lines.append("    <meta charset='utf-8'>")
    html_lines.append("    <title>SupaNova AI Project Report</title>")
    html_lines.append(css_styles)
    html_lines.append("</head>")
    html_lines.append("<body>")

    lines = md_content.split("\n")
    idx = 0
    while idx < len(lines):
        line = lines[idx]
        
        # Table parsing
        if line.strip().startswith("|") and idx < len(lines) - 1:
            if not in_table:
                html_lines.append("<table>")
                in_table = True
            
            # Skip separator lines
            if "---" in line:
                idx += 1
                continue
                
            cols = [c.strip() for c in line.split("|")[1:-1]]
            html_lines.append("  <tr>")
            for col in cols:
                tag = "th" if idx == 0 or (idx > 0 and "---" in lines[idx-1]) else "td"
                # Parse bold and code in columns
                col = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', col)
                col = re.sub(r'`(.*?)`', r'<code>\1</code>', col)
                html_lines.append(f"    <{tag}>{col}</{tag}>")
            html_lines.append("  </tr>")
            idx += 1
            continue
        elif in_table:
            html_lines.append("</table>")
            in_table = False

        # Headings
        if line.startswith("# "):
            title = line[2:].strip()
            # If cover page or first title, customize it
            if title.startswith("Internship Project Report"):
                html_lines.append("<div class='cover-page'>")
                html_lines.append("  <div class='cover-logo'>SupaNova AI</div>")
                html_lines.append("  <div class='cover-subtitle'>Real-time Customer Support Helpdesk & Live Chat System</div>")
                html_lines.append("  <div class='cover-details'>")
                html_lines.append("    <div class='cover-details-row'><span class='cover-details-label'>Host Organization:</span><span class='cover-details-value'>Codtech IT Solutions</span></div>")
                html_lines.append("    <div class='cover-details-row'><span class='cover-details-label'>Intern Name:</span><span class='cover-details-value'>Naguru Suhas</span></div>")
                html_lines.append("    <div class='cover-details-row'><span class='cover-details-label'>Intern ID:</span><span class='cover-details-value'>CITS1993</span></div>")
                html_lines.append("    <div class='cover-details-row'><span class='cover-details-label'>Duration:</span><span class='cover-details-value'>8 Weeks</span></div>")
                html_lines.append("    <div class='cover-details-row'><span class='cover-details-label'>Submission Date:</span><span class='cover-details-value'>June 18, 2026</span></div>")
                html_lines.append("  </div>")
                html_lines.append("</div>")
            else:
                html_lines.append(f"<h1>{title}</h1>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:].strip()}</h2>")
        elif line.startswith("### "):
            html_lines.append(f"<h3>{line[4:].strip()}</h3>")
        
        # Horizontal Rule
        elif line.strip() == "---":
            html_lines.append("<hr />")
            
        # Lists
        elif line.strip().startswith("* ") or line.strip().startswith("- "):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            item_text = line.strip()[2:].strip()
            # Parse inline formatting
            item_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', item_text)
            item_text = re.sub(r'`(.*?)`', r'<code>\1</code>', item_text)
            html_lines.append(f"  <li>{item_text}</li>")
        else:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
                
            if line.strip():
                # Regular paragraph
                p_text = line.strip()
                p_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', p_text)
                p_text = re.sub(r'`(.*?)`', r'<code>\1</code>', p_text)
                html_lines.append(f"<p>{p_text}</p>")
                
        idx += 1

    if in_list:
        html_lines.append("</ul>")
    if in_table:
        html_lines.append("</table>")
        
    html_lines.append("</body>")
    html_lines.append("</html>")
    return "\n".join(html_lines)

def main():
    doc_dir = os.path.dirname(os.path.abspath(__file__))
    md_path = os.path.join(doc_dir, "Project_Documentation.md")
    html_path = os.path.join(doc_dir, "Project_Documentation.html")
    pdf_path = os.path.join(doc_dir, "Project_Documentation.pdf")
    
    print(f"Reading Markdown: {md_path}")
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        sys.exit(1)
        
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
        
    print("Converting Markdown to styled HTML...")
    html_content = markdown_to_html(md_content)
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Styled HTML generated: {html_path}")
    
    # Attempt compilation to PDF via patchright
    print("Attempting to compile HTML to PDF using patchright...")
    try:
        from patchright.sync_api import sync_playwright
        
        with sync_playwright() as p:
            print("Launching headless Chromium...")
            browser = p.chromium.launch()
            page = browser.new_page()
            
            print(f"Loading local HTML file: {html_path}")
            # Use absolute file path URL
            file_url = "file:///" + html_path.replace("\\", "/")
            page.goto(file_url)
            
            print("Writing PDF...")
            page.pdf(
                path=pdf_path,
                format="A4",
                margin={
                    "top": "20mm",
                    "bottom": "20mm",
                    "left": "20mm",
                    "right": "20mm"
                },
                print_background=True
            )
            browser.close()
            
        print(f"Success! PDF generated successfully: {pdf_path}")
        
    except Exception as e:
        safe_error = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"Warning: PDF generation using patchright failed: {safe_error}")
        print("\n=== FALLBACK DIRECTIONS ===")
        print("To complete the PDF generation:")
        print("1. Run 'playwright install chromium' or 'patchright install chromium' in your shell to fetch the required browser binary.")
        print("2. Re-run this script: python documentation/generate_pdf.py")
        print("   OR")
        print(f"3. Open the generated HTML file: '{html_path}' in your browser, press Ctrl+P (or Cmd+P) and select 'Save as PDF' to save it as '{pdf_path}'.")

if __name__ == "__main__":
    main()
