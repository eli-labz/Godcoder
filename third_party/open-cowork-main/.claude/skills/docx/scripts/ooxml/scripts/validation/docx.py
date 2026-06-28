"""
Validator for Word document XML files against XSD schemas.
"""

import random
import re
import tempfile
import zipfile

import defusedxml.minidom
import lxml.etree

from .base import BaseSchemaValidator


class DOCXSchemaValidator(BaseSchemaValidator):
    """Validator for Word document XML files against XSD schemas."""

    # Word-specific namespaces
    WORD_2006_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    W14_NAMESPACE = "http://schemas.microsoft.com/office/word/2010/wordml"
    W16CID_NAMESPACE = "http://schemas.microsoft.com/office/word/2016/wordml/cid"

    # Word-specific element to relationship type mappings
    # Start with empty mapping - add specific cases as we discover them
    ELEMENT_RELATIONSHIP_TYPES = {}

    def validate(self):
        """Run all validation checks and return True if all pass."""
        # Test 0: XML well-formedness
        if not self.validate_xml():
            return False

        # Test 1: Namespace declarations
        all_valid = True
        if not self.validate_namespaces():
            all_valid = False

        # Test 2: Unique IDs
        if not self.validate_unique_ids():
            all_valid = False

        # Test 3: Relationship and file reference validation
        if not self.validate_file_references():
            all_valid = False

        # Test 4: Content type declarations
        if not self.validate_content_types():
            all_valid = False

        # Test 5: XSD schema validation
        if not self.validate_against_xsd():
            all_valid = False

        # Test 6: Whitespace preservation
        if not self.validate_whitespace_preservation():
            all_valid = False

        # Test 7: Deletion validation
        if not self.validate_deletions():
            all_valid = False

        # Test 8: Insertion validation
        if not self.validate_insertions():
            all_valid = False

        # Test 9: Relationship ID reference validation
        if not self.validate_all_relationship_ids():
            all_valid = False

        # Test 10: Hex ID constraints (paraId, durableId)
        if not self.validate_hex_id_constraints():
            all_valid = False

        # Count and compare paragraphs
        self.compare_paragraph_counts()

        return all_valid

    def validate_whitespace_preservation(self):
        """
        Validate that w:t elements with whitespace have xml:space='preserve'.
        """
        errors = []

        for xml_file in self.xml_files:
            # Only check document.xml files
            if xml_file.name != "document.xml":
                continue

            try:
                root = lxml.etree.parse(str(xml_file)).getroot()

                # Find all w:t elements
                for elem in root.iter(f"{{{self.WORD_2006_NAMESPACE}}}t"):
                    if elem.text:
                        text = elem.text
                        # Check if text starts or ends with whitespace
                        if re.match(r"^\s.*", text) or re.match(r".*\s$", text):
                            # Check if xml:space="preserve" attribute exists
                            xml_space_attr = f"{{{self.XML_NAMESPACE}}}space"
                            if (
                                xml_space_attr not in elem.attrib
                                or elem.attrib[xml_space_attr] != "preserve"
                            ):
                                # Show a preview of the text
                                text_preview = (
                                    repr(text)[:50] + "..."
                                    if len(repr(text)) > 50
                                    else repr(text)
                                )
                                errors.append(
                                    f"  {xml_file.relative_to(self.unpacked_dir)}: "
                                    f"Line {elem.sourceline}: w:t element with whitespace missing xml:space='preserve': {text_preview}"
                                )

            except (lxml.etree.XMLSyntaxError, Exception) as e:
                errors.append(
                    f"  {xml_file.relative_to(self.unpacked_dir)}: Error: {e}"
                )

        if errors:
            print(f"FAILED - Found {len(errors)} whitespace preservation violations:")
            for error in errors:
                print(error)
            return False
        else:
            if self.verbose:
                print("PASSED - All whitespace is properly preserved")
            return True

    def validate_deletions(self):
        """
        Validate that w:t elements are not within w:del elements.
        For some reason, XSD validation does not catch this, so we do it manually.
        """
        errors = []

        for xml_file in self.xml_files:
            # Only check document.xml files
            if xml_file.name != "document.xml":
                continue

            try:
                root = lxml.etree.parse(str(xml_file)).getroot()

                # Find all w:t elements that are descendants of w:del elements
                namespaces = {"w": self.WORD_2006_NAMESPACE}
                xpath_expression = ".//w:del//w:t"
                problematic_t_elements = root.xpath(
                    xpath_expression, namespaces=namespaces
                )
                for t_elem in problematic_t_elements:
                    if t_elem.text:
                        # Show a preview of the text
                        text_preview = (
                            repr(t_elem.text)[:50] + "..."
                            if len(repr(t_elem.text)) > 50
                            else repr(t_elem.text)
                        )
                        errors.append(
                            f"  {xml_file.relative_to(self.unpacked_dir)}: "
                            f"Line {t_elem.sourceline}: <w:t> found within <w:del>: {text_preview}"
                        )

            except (lxml.etree.XMLSyntaxError, Exception) as e:
                errors.append(
                    f"  {xml_file.relative_to(self.unpacked_dir)}: Error: {e}"
                )

        if errors:
            print(f"FAILED - Found {len(errors)} deletion validation violations:")
            for error in errors:
                print(error)
            return False
        else:
            if self.verbose:
                print("PASSED - No w:t elements found within w:del elements")
            return True

    def count_paragraphs_in_unpacked(self):
        """Count the number of paragraphs in the unpacked document."""
        count = 0

        for xml_file in self.xml_files:
            # Only check document.xml files
            if xml_file.name != "document.xml":
                continue

            try:
                root = lxml.etree.parse(str(xml_file)).getroot()
                # Count all w:p elements
                paragraphs = root.findall(f".//{{{self.WORD_2006_NAMESPACE}}}p")
                count = len(paragraphs)
            except Exception as e:
                print(f"Error counting paragraphs in unpacked document: {e}")

        return count

    def count_paragraphs_in_original(self):
        """Count the number of paragraphs in the original docx file."""
        count = 0

        try:
            # Create temporary directory to unpack original
            with tempfile.TemporaryDirectory() as temp_dir:
                # Unpack original docx
                with zipfile.ZipFile(self.original_file, "r") as zip_ref:
                    zip_ref.extractall(temp_dir)

                # Parse document.xml
                doc_xml_path = temp_dir + "/word/document.xml"
                root = lxml.etree.parse(doc_xml_path).getroot()

                # Count all w:p elements
                paragraphs = root.findall(f".//{{{self.WORD_2006_NAMESPACE}}}p")
                count = len(paragraphs)

        except Exception as e:
            print(f"Error counting paragraphs in original document: {e}")

        return count

    def validate_insertions(self):
        """
        Validate that w:delText elements are not within w:ins elements.
        w:delText is only allowed in w:ins if nested within a w:del.
        """
        errors = []

        for xml_file in self.xml_files:
            if xml_file.name != "document.xml":
                continue

            try:
                root = lxml.etree.parse(str(xml_file)).getroot()
                namespaces = {"w": self.WORD_2006_NAMESPACE}

                # Find w:delText in w:ins that are NOT within w:del
                invalid_elements = root.xpath(
                    ".//w:ins//w:delText[not(ancestor::w:del)]",
                    namespaces=namespaces
                )

                for elem in invalid_elements:
                    text_preview = (
                        repr(elem.text or "")[:50] + "..."
                        if len(repr(elem.text or "")) > 50
                        else repr(elem.text or "")
                    )
                    errors.append(
                        f"  {xml_file.relative_to(self.unpacked_dir)}: "
                        f"Line {elem.sourceline}: <w:delText> within <w:ins>: {text_preview}"
                    )

            except (lxml.etree.XMLSyntaxError, Exception) as e:
                errors.append(
                    f"  {xml_file.relative_to(self.unpacked_dir)}: Error: {e}"
                )

        if errors:
            print(f"FAILED - Found {len(errors)} insertion validation violations:")
            for error in errors:
                print(error)
            return False
        else:
            if self.verbose:
                print("PASSED - No w:delText elements within w:ins elements")
            return True

    def compare_paragraph_counts(self):
        """Compare paragraph counts between original and new document."""
        original_count = self.count_paragraphs_in_original()
        new_count = self.count_paragraphs_in_unpacked()

        diff = new_count - original_count
        diff_str = f"+{diff}" if diff > 0 else str(diff)
        print(f"\nParagraphs: {original_count} → {new_count} ({diff_str})")

    def _parse_id_value(self, val: str) -> int:
        """Parse an ID value that may be hex or decimal.

        OOXML spec says these should be ST_LongHexNumber (hex), but some
        Microsoft documents store durableId as decimal.

        Heuristic:
        - If contains A-F: definitely hex
        - If exactly 8 hex chars (standard format): treat as hex
        - Otherwise (e.g., long decimal string): treat as decimal
        """
        val_upper = val.upper()
        # Contains A-F → definitely hex
        if any(c in val_upper for c in 'ABCDEF'):
            return int(val, 16)
        # Exactly 8 hex digits (standard OOXML format) → treat as hex
        if len(val) == 8 and all(c in '0123456789' for c in val):
            return int(val, 16)
        # Otherwise treat as decimal (e.g., "1892495468")
        return int(val, 10)

    def validate_hex_id_constraints(self):
        """Validate paraId < 0x80000000 and durableId < 0x7FFFFFFF per OOXML spec."""
        errors = []
        checks = [
            (f"{{{self.W14_NAMESPACE}}}paraId", 0x80000000),
            (f"{{{self.W16CID_NAMESPACE}}}durableId", 0x7FFFFFFF),
        ]

        for xml_file in self.xml_files:
            try:
                for elem in lxml.etree.parse(str(xml_file)).iter():
                    for attr, limit in checks:
                        if (val := elem.get(attr)) and self._parse_id_value(val) >= limit:
                            name = attr.split('}')[1]
                            errors.append(f"  {xml_file.name}:{elem.sourceline}: {name}={val} >= {hex(limit)}")
            except Exception:
                pass

        if errors:
            print(f"FAILED - {len(errors)} hex ID constraint violations:")
            for e in errors:
                print(e)
        elif self.verbose:
            print("PASSED - All paraId/durableId values within constraints")
        return not errors

    def repair(self) -> int:
        """Run DOCX-specific auto-repairs."""
        repairs = super().repair()
        repairs += self.repair_hex_id_constraints()
        return repairs

    def repair_hex_id_constraints(self) -> int:
        """Fix durableId >= 0x7FFFFFFF.

        Note: paraId is not auto-repaired because it may be referenced by
        commentsExtended.xml, commentsIds.xml, and comment threading (paraIdParent).
        Changing paraId without updating all references would break comment associations.
        """
        repairs = 0

        for xml_file in self.xml_files:
            try:
                content = xml_file.read_text(encoding="utf-8")
                dom = defusedxml.minidom.parseString(content)
                modified = False

                for elem in dom.getElementsByTagName("*"):
                    # Fix durableId >= 0x7FFFFFFF
                    if elem.hasAttribute("w16cid:durableId"):
                        durable_id = elem.getAttribute("w16cid:durableId")
                        if self._parse_id_value(durable_id) >= 0x7FFFFFFF:
                            new_id = f"{random.randint(1, 0x7FFFFFFE):08X}"
                            elem.setAttribute("w16cid:durableId", new_id)
                            print(f"  Repaired: {xml_file.name}: durableId {durable_id} → {new_id}")
                            repairs += 1
                            modified = True

                if modified:
                    xml_file.write_bytes(dom.toxml(encoding="UTF-8"))

            except Exception:
                pass

        return repairs


if __name__ == "__main__":
    raise RuntimeError("This module should not be run directly.")
