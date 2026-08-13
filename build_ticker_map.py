"""
Parses data/stock_list.txt ("Company Name (EXCH:CODE)" per line) and produces
data/tickers_mapped.csv with a best-guess Yahoo Finance symbol for every entry.

Yahoo Finance doesn't use MIC codes (XFRA, XPAR, XSWX, ...) as ticker suffixes -
it uses its own short suffixes (.F, .PA, .SW, ...). Some source rows also carry
non-Yahoo identifiers entirely (e.g. Mexican SIC cross-listing codes like
"9433N" for KDDI, which trade in Mexico but are quoted on Yahoo under the
stock's PRIMARY listing instead). Those are handled with an explicit override
table (MANUAL_OVERRIDES) below rather than a suffix rule.

This mapping is a best-effort starting point, not ground truth. Run
fetch_quarterly_prices.py to find out which symbols actually return data;
anything that fails is written to output/unresolved_tickers.csv for review.
"""
import csv
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "stock_list.txt"
OUT = ROOT / "data" / "tickers_mapped.csv"

LINE_RE = re.compile(r"^(.*)\s+\(([A-Za-z0-9.]+):([^)]+)\)\s*$")

# MIC / source-exchange code -> Yahoo Finance suffix (None = no suffix, i.e. US-style)
EXCHANGE_SUFFIX = {
    "XNYS": "", "XNAS": "", "BATS": "", "XASE": "",
    "OTCM": "",
    "XFRA": ".F",
    "XETR": ".DE",
    "XWBO": ".VI",
    "XPAR": ".PA",
    "XAMS": ".AS",
    "XBRU": ".BR",
    "XLIS": ".LS",
    "XSWX": ".SW",
    "XLON": ".L",
    "XMIL": ".MI",
    "XWAR": ".WA",
    "XSTO": ".ST",
    "XHEL": ".HE",
    "XOSL": ".OL",
    "XCSE": ".CO",
    "BMEX": ".MC",
    "XDUB": ".IR",
    "XASX": ".AX",
    "XPHS": ".PS",
    "XKRX": ".KS",
    "XTSX": ".V",
    "NEOE": ".NE",
    "XCNQ": ".CN",
}

# For entries where the exchange-suffix rule doesn't produce a real Yahoo
# symbol (foreign cross-listing codes, share-class tickers, private/pre-IPO
# names, etc.). Key = exact "Name (EXCH:CODE)" source line.
MANUAL_OVERRIDES = {
    # Japanese primary-listing tickers instead of Mexican SIC cross-listing codes
    "Murata Manufacturing Co., Ltd. (XMEX:6981N)": "6981.T",
    "KDDI CORPORATION (XMEX:9433N)": "9433.T",
    "KONAMI GROUP CORPORATION (XMEX:9766N)": "9766.T",
    "FAST RETAILING CO., LTD. (XMEX:9983N)": "9983.T",
    # Other XMEX cross-listings -> primary home-exchange ticker
    "Sika Ltd (XMEX:SIKAN)": "SIKA.SW",
    "ROLLS-ROYCE HOLDINGS PLC (XMEX:RRN)": "RR.L",
    "AIRTEL AFRICA PLC (XMEX:AAFN)": "AAF.L",
    # Milan cross-listing of a NASDAQ stock -> primary US ticker
    "TERADYNE, INC. (XMIL:1TER)": "TER",
    # London international order book code -> primary Swiss listing
    "Montana Aerospace AG (XLON:0AAI)": "AERO.SW",
    # Nordic share classes need a hyphen on Yahoo, not a space
    "Addtech AB (XSTO:ADDT B)": "ADDT-B.ST",
    "Assa Abloy AB (XSTO:ASSA B)": "ASSA-B.ST",
    "Atlas Copco AB (XSTO:ATCO A)": "ATCO-A.ST",
    "Saab AB (XSTO:SAAB B)": "SAAB-B.ST",
    "SSAB AB (XSTO:SSAB B)": "SSAB-B.ST",
    "Volvo AB (XSTO:VOLV B)": "VOLV-B.ST",
    # BAE Systems / BT Group carry a trailing "." in the LSE code
    "BAE SYSTEMS PLC (XLON:BA.)": "BA.L",
    "BT GROUP PLC (XLON:BT.A)": "BT-A.L",
    # Korean 6-digit code
    "KSPCO.,LTD (XKRX:073010)": "073010.KS",
    # SpaceX - private company, no public Yahoo Finance quote exists.
    "SPACE EXPLORATION TECHNOLOGIES CORP. (XFRA:SPX)": None,
    # XWBO (Vienna) is used in the source list as a catch-all code for several
    # companies that are NOT Austrian and don't actually trade in Vienna -
    # route these to their real primary listing instead of a fake ".VI" symbol.
    # (Andritz AG and voestalpine AG genuinely are Austrian/Vienna-listed, so
    # those two are left to the default suffix rule.)
    "JAPAN TOBACCO INC. (XWBO:JAT)": "2914.T",
    "Sony Group Corporation (XWBO:SON1)": "6758.T",
    "CVC CAPITAL PARTNERS PLC (XWBO:CVC)": "CVC.AS",
    "Gaztransport et Technigaz SA (XWBO:GTT)": "GTT.PA",
    "HALLIBURTON COMPANY (XWBO:HAL)": "HAL",
    "Straumann Holding Ltd (XWBO:STMN)": "STMN.SW",
    # Borsa Italiana ticker for STMicroelectronics is STM, not the source code STMMI
    "STMicroelectronics NV (XMIL:STMMI)": "STM.MI",
}

# Duplicate source rows (identical company appears twice in the list) collapse
# to one column in the output; both original lines still map to the same symbol.


def map_symbol(name: str, exch: str, code: str, full_line: str) -> tuple[str | None, str]:
    if full_line in MANUAL_OVERRIDES:
        sym = MANUAL_OVERRIDES[full_line]
        return sym, "manual override"
    if exch not in EXCHANGE_SUFFIX:
        return None, f"UNKNOWN EXCHANGE CODE '{exch}' - needs manual mapping"
    suffix = EXCHANGE_SUFFIX[exch]
    # Yahoo uses hyphens, not spaces, for share-class tickers (e.g. "BRK B" -> BRK-B)
    clean_code = code.replace(" ", "-")
    guess = f"{clean_code}{suffix}"
    note = "auto (exchange suffix rule)"
    if exch == "XPHS":
        note += " - Yahoo coverage of Philippine Stock Exchange is inconsistent, verify"
    return guess, note


def main():
    rows = []
    seen_names = set()
    with SRC.open() as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            m = LINE_RE.match(line)
            if not m:
                print(f"WARN: could not parse line {lineno}: {line!r}")
                continue
            name, exch, code = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
            symbol, note = map_symbol(name, exch, code, line)
            dup = name in seen_names
            seen_names.add(name)
            rows.append({
                "company_name": name,
                "source_exchange": exch,
                "source_code": code,
                "yahoo_symbol_guess": symbol or "",
                "mapping_note": note,
                "duplicate_row": "yes" if dup else "",
            })

    OUT.parent.mkdir(exist_ok=True)
    with OUT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "company_name", "source_exchange", "source_code",
            "yahoo_symbol_guess", "mapping_note", "duplicate_row",
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT}")
    unknown = [r for r in rows if "UNKNOWN" in r["mapping_note"]]
    if unknown:
        print(f"{len(unknown)} rows need manual mapping (unknown exchange code):")
        for r in unknown:
            print(f"  {r['company_name']} ({r['source_exchange']}:{r['source_code']})")


if __name__ == "__main__":
    main()
