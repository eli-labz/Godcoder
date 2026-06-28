#!/usr/bin/env python3
"""Unpack DOCX files for editing.

Extracts the ZIP archive, pretty-prints XML files, and merges adjacent runs
with identical formatting (enabled by default).
"""

import argparse
import os
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import defusedxml.minidom
from helpers.merge_runs import merge_runs as do_merge_runs

# Smart quotes that get mangled by the tokenizer - convert to XML entities
# Using hex escapes since we can't type the actual characters
SMART_QUOTE_REPLACEMENTS = {
    "\u201c": "&#x201C;",  # Left double quote
    "\u201d": "&#x201D;",  # Right double quote
    "\u2018": "&#x2018;",  # Left single quote
    "\u2019": "&#x2019;",  # Right single quote
}


def unpack(
    input_file: str,
    output_directory: str,
    merge_runs: bool = True,
) -> tuple[None, str]:
    """Unpack a DOCX file and prepare for editing.

    Args:
        input_file: Path to DOCX file
        output_directory: Path to output directory
        merge_runs: If True, merge adjacent runs with identical formatting

    Returns:
        (None, message) - message indicates success or failure
    """
    input_path = Path(input_file)
    output_path = Path(output_directory)

    if not input_path.exists():
        return None, f"Error: {input_file} does not exist"

    if input_path.suffix.lower() != ".docx":
        return None, f"Error: {input_file} must be a .docx file"

    try:
        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)

        # Extract ZIP contents
        with zipfile.ZipFile(input_path, "r") as zf:
            zf.extractall(output_path)

        # Pretty print all XML files
        xml_files = list(output_path.rglob("*.xml")) + list(output_path.rglob("*.rels"))
        for xml_file in xml_files:
            _pretty_print_xml(xml_file)

        message = f"Unpacked {input_file} ({len(xml_files)} XML files)"

        # Merge runs if requested
        if merge_runs:
            merge_count, _ = do_merge_runs(str(output_path))
            message += f", merged {merge_count} runs"

        # Escape smart quotes AFTER merge_runs (which rewrites files)
        for xml_file in xml_files:
            _escape_smart_quotes(xml_file)

        return None, message

    except zipfile.BadZipFile:
        return None, f"Error: {input_file} is not a valid DOCX file"
    except Exception as e:
        return None, f"Error unpacking: {e}"


def _pretty_print_xml(xml_file: Path) -> None:
    """Pretty print an XML file with indentation."""
    content = xml_file.read_text(encoding="utf-8")
    dom = defusedxml.minidom.parseString(content)
    xml_file.write_bytes(dom.toprettyxml(indent="  ", encoding="utf-8"))


def _escape_smart_quotes(xml_file: Path) -> None:
    """Replace smart quotes with XML entities so they survive tokenization."""
    content = xml_file.read_text(encoding="utf-8")
    for char, entity in SMART_QUOTE_REPLACEMENTS.items():
        content = content.replace(char, entity)
    xml_file.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unpack a DOCX file for editing")
    parser.add_argument("input_file", help="DOCX file to unpack")
    parser.add_argument("output_directory", help="Output directory")
    parser.add_argument(
        "--merge-runs",
        type=lambda x: x.lower() == "true",
        default=True,
        metavar="true|false",
        help="Merge adjacent runs with identical formatting (default: true)",
    )
    args = parser.parse_args()

    _, message = unpack(
        args.input_file, args.output_directory, merge_runs=args.merge_runs
    )
    print(message)

    if "Error" in message:
        sys.exit(1)
