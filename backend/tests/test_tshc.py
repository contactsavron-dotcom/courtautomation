from app.scrapers.tshc import parse_tshc_html, _extract_total_cases, _convert_date

SAMPLE_HTML = """
<html>
<body>
<section class="causes">
<div>TOTAL CASES FOR01390=2</div>
<table class="table">
<thead>
    <tr class="table-primary">
        <th>Sl.No.</th>
        <th>Case</th>
        <th>Party Details</th>
        <th>Petitioner Advocate</th>
        <th>Respondent Advocate</th>
        <th>District/Remarks</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td colspan="6"><span class="stage-name">ADMISSION</span></td>
    </tr>
    <tr>
        <td>1</td>
        <td>WP/12345/2025</td>
        <td>
            <span>ABC Enterprises</span>
            <br/>vs<br/>
            <span>State of Telangana</span>
        </td>
        <td><div>AMBALA RAJU</div></td>
        <td><div>GP FOR REVENUE</div></td>
        <td>HYDERABAD</td>
    </tr>
    <tr>
        <td colspan="6"><span class="stage-name">HEARING</span></td>
    </tr>
    <tr>
        <td>2</td>
        <td>CRP/678/2024</td>
        <td>
            <span>XYZ Corp Ltd</span>
            <br/>vs<br/>
            <span>DEF Holdings Pvt Ltd</span>
        </td>
        <td><div>AMBALA RAJU</div><div>CO-COUNSEL NAME</div></td>
        <td><div>SOME OTHER ADVOCATE</div></td>
        <td>RANGAREDDY
SR filed on 01-01-2025</td>
    </tr>
</tbody>
</table>
</section>
</body>
</html>
"""

SAMPLE_NO_DATA_HTML = """
<html><body>
<section class="causes">
    <h2 style="text-align: center;">No Data Available for This Search !!!!</h2>
</section>
</body></html>
"""


def test_parse_tshc_html_extracts_cases():
    cases = parse_tshc_html(SAMPLE_HTML)
    assert len(cases) == 2


def test_parse_tshc_html_first_case_fields():
    cases = parse_tshc_html(SAMPLE_HTML)
    c = cases[0]
    assert c.serial_no == "1"
    assert c.case_no == "WP/12345/2025"
    assert c.parties_petitioner == "ABC Enterprises"
    assert c.parties_respondent == "State of Telangana"
    assert c.petitioner_advocate == "AMBALA RAJU"
    assert c.respondent_advocate == "GP FOR REVENUE"
    assert c.district == "HYDERABAD"


def test_parse_tshc_html_second_case_fields():
    cases = parse_tshc_html(SAMPLE_HTML)
    c = cases[1]
    assert c.serial_no == "2"
    assert c.case_no == "CRP/678/2024"
    assert c.parties_petitioner == "XYZ Corp Ltd"
    assert c.parties_respondent == "DEF Holdings Pvt Ltd"
    assert c.district == "RANGAREDDY"


def test_parse_tshc_html_no_data_returns_empty():
    cases = parse_tshc_html(SAMPLE_NO_DATA_HTML)
    assert cases == []


def test_extract_total_cases():
    assert _extract_total_cases(SAMPLE_HTML, "01390") == 2


def test_extract_total_cases_zero():
    assert _extract_total_cases(SAMPLE_NO_DATA_HTML, "01390") == 0


def test_convert_date():
    assert _convert_date("2026-03-18") == "18-03-2026"
    assert _convert_date("2025-01-05") == "05-01-2025"
