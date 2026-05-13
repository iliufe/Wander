from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "Wander_Demo_Day_Group16.pptx"
NOTES = ROOT.parent / "Wander_Demo_Day_speaker_notes.md"

EMU = 914400
SLIDE_W = 13.333333
SLIDE_H = 7.5

INK = "101721"
SOFT = "667085"
PAPER = "FFF8EF"
CREAM = "F3EADB"
GREEN = "0F8F83"
GREEN_DARK = "0B6F66"
SAND = "D7B98D"
WHITE = "FFFFFF"


def emu(value: float) -> int:
    return round(value * EMU)


def safe(value: str) -> str:
    return escape(value, {'"': "&quot;"})


def solid_fill(color: str) -> str:
    return f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'


def shape(
    sid: int,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str,
    line: str | None = None,
    radius: str = "roundRect",
    text: list[str] | None = None,
    font_size: int = 18,
    font_color: str = INK,
    bold: bool = False,
    align: str = "ctr",
    margin: int = 90000,
) -> str:
    line_xml = (
        f'<a:ln w="9525"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>'
        if line
        else '<a:ln><a:noFill/></a:ln>'
    )
    tx_body = ""
    if text:
        paragraphs = []
        for line_text in text:
            paragraphs.append(
                f"""
                <a:p>
                  <a:pPr algn="{align}"/>
                  <a:r>
                    <a:rPr lang="en-US" sz="{font_size * 100}" dirty="0"{' b="1"' if bold else ""}>
                      {solid_fill(font_color)}
                      <a:latin typeface="Aptos"/>
                    </a:rPr>
                    <a:t>{safe(line_text)}</a:t>
                  </a:r>
                </a:p>
                """
            )
        tx_body = f"""
        <p:txBody>
          <a:bodyPr wrap="square" lIns="{margin}" tIns="{margin}" rIns="{margin}" bIns="{margin}" anchor="mid"/>
          <a:lstStyle/>
          {''.join(paragraphs)}
        </p:txBody>
        """
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{sid}" name="Shape {sid}"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
        <a:prstGeom prst="{radius}"><a:avLst/></a:prstGeom>
        {solid_fill(fill)}
        {line_xml}
      </p:spPr>
      {tx_body}
    </p:sp>
    """


def text_box(
    sid: int,
    x: float,
    y: float,
    w: float,
    h: float,
    lines: list[str],
    font_size: int = 24,
    color: str = INK,
    bold: bool = False,
    align: str = "l",
    font: str = "Aptos",
) -> str:
    paragraphs = []
    for line in lines:
        paragraphs.append(
            f"""
            <a:p>
              <a:pPr algn="{align}"/>
              <a:r>
                <a:rPr lang="en-US" sz="{font_size * 100}" dirty="0"{' b="1"' if bold else ""}>
                  {solid_fill(color)}
                  <a:latin typeface="{safe(font)}"/>
                </a:rPr>
                <a:t>{safe(line)}</a:t>
              </a:r>
            </a:p>
            """
        )
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{sid}" name="Text {sid}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/>
        <a:lstStyle/>
        {''.join(paragraphs)}
      </p:txBody>
    </p:sp>
    """


def logo(sid: int, x: float, y: float) -> str:
    return (
        shape(sid, x, y, 0.72, 0.72, GREEN, None, "ellipse", ["W"], 24, WHITE, True)
        + text_box(sid + 1, x + 0.86, y + 0.11, 2.0, 0.4, ["Wander"], 22, INK, True)
    )


def slide_xml(slide_num: int, objects: list[str], bg: str = PAPER) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr>{solid_fill(bg)}<a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      {''.join(objects)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"""


def make_slides() -> list[str]:
    slides: list[list[str]] = []

    slides.append(
        [
            shape(2, 9.5, -0.7, 4.8, 3.2, CREAM, None, "ellipse"),
            shape(3, -0.8, 5.7, 3.8, 2.3, "E7D1AA", None, "ellipse"),
            logo(4, 0.75, 0.65),
            text_box(6, 0.75, 2.0, 7.5, 1.1, ["Turn free time", "into a route."], 44, INK, True),
            text_box(7, 0.8, 4.42, 5.8, 0.45, ["ENT208TC · Session 2 · Group 16"], 18, SOFT, False),
            shape(8, 8.55, 1.52, 3.55, 4.8, WHITE, "EFE2CE", "roundRect"),
            shape(9, 8.92, 1.92, 2.8, 0.42, "E8F5F2", None, "roundRect", ["I have 3 hours after class"], 12, GREEN_DARK, True),
            shape(10, 8.92, 2.62, 2.3, 0.42, INK, None, "roundRect", ["hotpot + park"], 12, WHITE, True),
            shape(11, 8.92, 3.52, 2.78, 1.9, "F7F2E9", "EADBC2", "roundRect", ["Route A", "Hotpot · Park · Home"], 18, INK, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.34, 6.8, 0.6, ["The problem"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 2.0, 7.2, 1.0, ["A spontaneous outing", "still needs too much planning."], 34, INK, True),
            shape(6, 7.75, 1.35, 4.25, 3.4, WHITE, "E5D7C4", "roundRect"),
            text_box(
                7,
                8.12,
                1.9,
                3.45,
                1.5,
                ['“I just want to go somewhere after class,', 'but I need content, maps and reviews', 'before I can leave.”'],
                20,
                INK,
                False,
            ),
            shape(8, 1.0, 5.22, 2.2, 0.56, "E8F5F2", None, "roundRect", ["Discovery"], 16, GREEN_DARK, True),
            shape(9, 3.58, 5.22, 2.2, 0.56, "F7E7CF", None, "roundRect", ["Verification"], 16, INK, True),
            shape(10, 6.16, 5.22, 2.2, 0.56, "E9EEF2", None, "roundRect", ["Navigation"], 16, INK, True),
            shape(11, 8.74, 5.22, 2.2, 0.56, "F0D7D0", None, "roundRect", ["Manual timing"], 16, INK, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.32, 6.8, 0.6, ["What we built"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 2.02, 8.2, 0.8, ["Wander turns one sentence into three real route options."], 34, INK, True),
            shape(6, 0.95, 4.04, 2.65, 0.95, WHITE, "E7DAC7", "roundRect", ["Natural language"], 18, INK, True),
            shape(7, 4.05, 4.04, 2.65, 0.95, WHITE, "E7DAC7", "roundRect", ["Qwen intent"], 18, INK, True),
            shape(8, 7.15, 4.04, 2.65, 0.95, WHITE, "E7DAC7", "roundRect", ["AMap POIs"], 18, INK, True),
            shape(9, 10.25, 4.04, 2.65, 0.95, GREEN, None, "roundRect", ["Executable routes"], 17, WHITE, True),
            text_box(10, 3.67, 4.27, 0.3, 0.3, ["→"], 24, SOFT, True),
            text_box(11, 6.77, 4.27, 0.3, 0.3, ["→"], 24, SOFT, True),
            text_box(12, 9.88, 4.27, 0.3, 0.3, ["→"], 24, SOFT, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.22, 7.0, 0.6, ["Demo backup"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 1.86, 7.0, 0.75, ["Home → generate → choose route"], 34, INK, True),
            shape(6, 0.82, 2.86, 3.75, 3.75, WHITE, "E7DAC7", "roundRect"),
            shape(7, 1.05, 3.08, 3.29, 2.0, "E8F5F2", None, "roundRect"),
            shape(8, 2.32, 3.72, 0.34, 0.34, GREEN, None, "ellipse"),
            shape(9, 1.05, 5.32, 3.29, 0.56, "F7F2E9", "E7DAC7", "roundRect", ["Start near XJTLU Taicang"], 12, INK, True),
            shape(10, 4.92, 2.86, 3.75, 3.75, WHITE, "E7DAC7", "roundRect"),
            shape(11, 5.22, 3.25, 3.15, 1.08, "F7F2E9", "E7DAC7", "roundRect", ["I want hotpot, a movie,", "then a park walk."], 16, INK, True),
            shape(12, 5.22, 4.64, 0.95, 0.52, INK, None, "roundRect", ["3h"], 14, WHITE, True),
            shape(13, 6.38, 4.64, 0.95, 0.52, GREEN, None, "roundRect", ["Taxi"], 14, WHITE, True),
            shape(14, 9.02, 2.86, 3.75, 3.75, WHITE, "E7DAC7", "roundRect"),
            shape(15, 9.32, 3.18, 3.15, 0.72, GREEN, None, "roundRect", ["Route 1"], 17, WHITE, True),
            shape(16, 9.32, 4.12, 3.15, 0.72, "F7F2E9", "E7DAC7", "roundRect", ["Route 2"], 17, INK, True),
            shape(17, 9.32, 5.06, 3.15, 0.72, "F7F2E9", "E7DAC7", "roundRect", ["Route 3"], 17, INK, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.28, 7.0, 0.6, ["Validation evidence"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 1.94, 7.0, 0.75, ["Before / after from product testing"], 34, INK, True),
            shape(6, 0.9, 3.0, 5.35, 2.6, WHITE, "E7DAC7", "roundRect"),
            text_box(7, 1.22, 3.32, 2.4, 0.4, ["Before"], 20, SOFT, True),
            text_box(8, 1.22, 3.95, 4.5, 1.0, ["Users switched between apps", "and manually estimated timing."], 24, INK, True),
            shape(9, 7.05, 3.0, 5.35, 2.6, GREEN, None, "roundRect"),
            text_box(10, 7.38, 3.32, 2.4, 0.4, ["After"], 20, "D7FFF7", True),
            text_box(11, 7.38, 3.95, 4.5, 1.0, ["One flow: locate, describe,", "choose an executable route."], 24, WHITE, True),
            shape(12, 1.15, 6.04, 2.4, 0.5, "E8F5F2", None, "roundRect", ["3 route options"], 14, GREEN_DARK, True),
            shape(13, 3.8, 6.04, 2.4, 0.5, "E8F5F2", None, "roundRect", ["real POIs"], 14, GREEN_DARK, True),
            shape(14, 6.45, 6.04, 2.4, 0.5, "E8F5F2", None, "roundRect", ["map navigation"], 14, GREEN_DARK, True),
            shape(15, 9.1, 6.04, 2.4, 0.5, "E8F5F2", None, "roundRect", ["profile login"], 14, GREEN_DARK, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.28, 7.0, 0.6, ["What testing changed"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 1.94, 8.0, 0.75, ["Specific findings → product changes"], 34, INK, True),
            shape(6, 0.9, 3.12, 3.65, 2.45, WHITE, "E7DAC7", "roundRect", ["Location drift", "manual map pick + address search"], 20, INK, True),
            shape(7, 4.85, 3.12, 3.65, 2.45, WHITE, "E7DAC7", "roundRect", ["Generic routes", "keyword intent + real POI scoring"], 20, INK, True),
            shape(8, 8.8, 3.12, 3.65, 2.45, WHITE, "E7DAC7", "roundRect", ["Interrupted planning", "persistent background generation"], 20, INK, True),
        ]
    )

    slides.append(
        [
            logo(2, 0.72, 0.52),
            text_box(4, 0.75, 1.32, 7.0, 0.6, ["What comes next"], 20, GREEN_DARK, True),
            text_box(5, 0.75, 2.0, 8.5, 0.9, ["Make route generation reliable enough for real use."], 34, INK, True),
            shape(6, 0.95, 3.55, 5.35, 1.65, WHITE, "E7DAC7", "roundRect", ["Current limitation", "External API latency and quota can still affect route generation."], 22, INK, True, "l"),
            shape(7, 7.0, 3.55, 5.35, 1.65, GREEN, None, "roundRect", ["Next step", "Add job queue, POI cache and route-quality monitoring."], 22, WHITE, True, "l"),
            text_box(8, 0.95, 6.28, 5.0, 0.4, ["Demo: wander-web-4pki.onrender.com"], 16, SOFT, False),
        ]
    )

    return [slide_xml(i + 1, s) for i, s in enumerate(slides)]


def content_types(slide_count: int) -> str:
    slide_overrides = "\n".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  {slide_overrides}
</Types>
"""


def presentation_xml(slide_count: int) -> str:
    sld_ids = "\n".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>' for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>{sld_ids}</p:sldIdLst>
  <p:sldSz cx="{emu(SLIDE_W)}" cy="{emu(SLIDE_H)}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>
"""


def presentation_rels(slide_count: int) -> str:
    rels = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    ]
    rels.extend(
        f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, slide_count + 1)
    )
    rels.append(
        f'<Relationship Id="rId{slide_count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(rels)}
</Relationships>
"""


def minimal_master() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>
"""


def minimal_layout() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>
"""


def theme_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Wander">
  <a:themeElements>
    <a:clrScheme name="Wander">
      <a:dk1><a:srgbClr val="{INK}"/></a:dk1>
      <a:lt1><a:srgbClr val="{PAPER}"/></a:lt1>
      <a:dk2><a:srgbClr val="{GREEN_DARK}"/></a:dk2>
      <a:lt2><a:srgbClr val="{CREAM}"/></a:lt2>
      <a:accent1><a:srgbClr val="{GREEN}"/></a:accent1>
      <a:accent2><a:srgbClr val="{SAND}"/></a:accent2>
      <a:accent3><a:srgbClr val="E8F5F2"/></a:accent3>
      <a:accent4><a:srgbClr val="F7E7CF"/></a:accent4>
      <a:accent5><a:srgbClr val="E9EEF2"/></a:accent5>
      <a:accent6><a:srgbClr val="F0D7D0"/></a:accent6>
      <a:hlink><a:srgbClr val="{GREEN}"/></a:hlink>
      <a:folHlink><a:srgbClr val="{GREEN_DARK}"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Wander"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>
"""


def rels_root() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def core_xml() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Wander Demo Day</dc:title>
  <dc:creator>Wander Group 16</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
"""


def app_xml(slide_count: int) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Wander</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>{slide_count}</Slides>
  <Company>Group 16</Company>
</Properties>
"""


def slide_rel() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>
"""


def write_pptx() -> None:
    slides = make_slides()
    with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types(len(slides)))
        z.writestr("_rels/.rels", rels_root())
        z.writestr("docProps/core.xml", core_xml())
        z.writestr("docProps/app.xml", app_xml(len(slides)))
        z.writestr("ppt/presentation.xml", presentation_xml(len(slides)))
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(len(slides)))
        z.writestr("ppt/slideMasters/slideMaster1.xml", minimal_master())
        z.writestr(
            "ppt/slideMasters/_rels/slideMaster1.xml.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>""",
        )
        z.writestr("ppt/slideLayouts/slideLayout1.xml", minimal_layout())
        z.writestr(
            "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>""",
        )
        z.writestr("ppt/theme/theme1.xml", theme_xml())
        for i, xml in enumerate(slides, 1):
            z.writestr(f"ppt/slides/slide{i}.xml", xml)
            z.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", slide_rel())


def write_notes() -> None:
    NOTES.write_text(
        """# Wander Demo Day Speaker Notes

## 1. Title
Wander is for the tiny window after class or work when users want to do something nearby, but do not want to plan for 30 minutes first.

## 2. The Problem
Emphasize the quote. The core pain is not lack of places; it is fragmented decision-making across content, maps, reviews and timing.

## 3. What We Built
One sentence: Wander turns a natural-language intention into three real, executable route options around the user.

## 4. Demo Backup
Live demo first. If the network/API fails, use this slide to explain the intended flow: locate, type request, set time and travel mode, generate routes, choose one.

## 5. Validation Evidence
Frame it as before/after. Before, users had to coordinate multiple apps. After, they can keep the planning loop in one product.

## 6. What Testing Changed
Mention three concrete iterations: map-point correction for GPS drift, stronger keyword intent parsing plus real POI scoring, and persistent route generation when switching pages.

## 7. What Comes Next
Be honest: external API latency and quota are still the biggest reliability risk. Next engineering step is a background job queue, POI cache and route-quality monitoring.
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    write_pptx()
    write_notes()
    print(OUT)
    print(NOTES)
