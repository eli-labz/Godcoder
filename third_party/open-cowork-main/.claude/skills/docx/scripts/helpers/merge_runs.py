"""Merge adjacent runs with identical formatting in DOCX.

Merges adjacent <w:r> elements that have:
- Same w:rsidRPr attribute
- Identical <w:rPr> properties

Also removes proofErr elements (spell/grammar markers) that block merging.
"""

from pathlib import Path

import defusedxml.minidom


def merge_runs(input_dir: str) -> tuple[int, str]:
    """Merge adjacent runs in document.xml.

    Args:
        input_dir: Path to unpacked DOCX directory

    Returns:
        (merge_count, message)
    """
    doc_xml = Path(input_dir) / "word" / "document.xml"

    if not doc_xml.exists():
        return 0, f"Error: {doc_xml} not found"

    try:
        dom = defusedxml.minidom.parseString(doc_xml.read_text(encoding="utf-8"))

        # Remove proofErr elements (spell/grammar markers block merging)
        _remove_proof_errors(dom.documentElement)

        # Find all paragraphs and merge runs
        merge_count = 0
        for para in _find_elements_by_tag(dom.documentElement, "p"):
            merge_count += _merge_adjacent_runs(para)
            # Consolidate text elements within merged runs
            for run in _find_elements_by_tag(para, "r"):
                _consolidate_text_elements(run)

        doc_xml.write_bytes(dom.toxml(encoding="UTF-8"))
        return merge_count, f"Merged {merge_count} runs"

    except Exception as e:
        return 0, f"Error: {e}"


def _find_elements_by_tag(root, tag: str) -> list:
    """Recursively find all elements matching a tag name."""
    elements = []

    def traverse(node):
        if node.nodeType == node.ELEMENT_NODE:
            if _matches_tag(node, tag):
                elements.append(node)
            for child in node.childNodes:
                traverse(child)

    traverse(root)
    return elements


def _matches_tag(node, tag: str) -> bool:
    """Check if node's tag matches (with or without namespace prefix)."""
    local_name = node.localName if node.localName else node.tagName
    return local_name == tag or local_name.endswith(f":{tag}")


def _remove_proof_errors(root):
    """Remove all proofErr elements (spell/grammar check markers)."""
    for elem in _find_elements_by_tag(root, "proofErr"):
        if elem.parentNode:
            elem.parentNode.removeChild(elem)


def _merge_adjacent_runs(paragraph) -> int:
    """Merge adjacent run elements with identical properties."""
    children = [c for c in paragraph.childNodes if c.nodeType == c.ELEMENT_NODE]
    if len(children) < 2:
        return 0

    merge_count = 0
    i = 0
    while i < len(children) - 1:
        current = children[i]
        next_elem = children[i + 1]

        if (
            _matches_tag(current, "r")
            and _matches_tag(next_elem, "r")
            and _can_merge_runs(current, next_elem)
        ):
            # Move content from next to current (skip rPr)
            for child in list(next_elem.childNodes):
                if child.nodeType == child.ELEMENT_NODE and not _matches_tag(
                    child, "rPr"
                ):
                    current.appendChild(child)
            paragraph.removeChild(next_elem)
            children.pop(i + 1)
            merge_count += 1
        else:
            i += 1

    return merge_count


def _can_merge_runs(run1, run2) -> bool:
    """Check if two runs can be merged (same rsidRPr and rPr)."""
    rsid1 = run1.getAttribute("w:rsidRPr") or run1.getAttribute("rsidRPr") or ""
    rsid2 = run2.getAttribute("w:rsidRPr") or run2.getAttribute("rsidRPr") or ""
    if rsid1 != rsid2:
        return False

    rpr1 = _get_rpr(run1)
    rpr2 = _get_rpr(run2)

    if (rpr1 is None) != (rpr2 is None):
        return False
    if rpr1 is None:
        return True
    return rpr1.toxml() == rpr2.toxml()  # type: ignore


def _get_rpr(run):
    """Get w:rPr child element from run."""
    for child in run.childNodes:
        if child.nodeType == child.ELEMENT_NODE and _matches_tag(child, "rPr"):
            return child
    return None


def _consolidate_text_elements(run):
    """Merge adjacent w:t elements within a run into a single w:t."""
    t_elements = [
        c for c in run.childNodes
        if c.nodeType == c.ELEMENT_NODE and _matches_tag(c, "t")
    ]

    for i in range(len(t_elements) - 1, 0, -1):  # Reverse to safely remove
        curr, prev = t_elements[i], t_elements[i - 1]
        # Only merge if adjacent (no elements between them, ignoring whitespace)
        if _are_adjacent(prev, curr):
            # Combine text
            prev_text = prev.firstChild.data if prev.firstChild else ""
            curr_text = curr.firstChild.data if curr.firstChild else ""
            merged = prev_text + curr_text

            if prev.firstChild:
                prev.firstChild.data = merged
            else:
                prev.appendChild(run.ownerDocument.createTextNode(merged))

            # xml:space="preserve" only needed for leading/trailing whitespace
            if merged.startswith(" ") or merged.endswith(" "):
                prev.setAttribute("xml:space", "preserve")
            elif prev.hasAttribute("xml:space"):
                prev.removeAttribute("xml:space")

            run.removeChild(curr)


def _are_adjacent(elem1, elem2):
    """Check if two elements are adjacent, ignoring whitespace text nodes."""
    node = elem1.nextSibling
    while node:
        if node == elem2:
            return True
        if node.nodeType == node.ELEMENT_NODE:
            return False  # Another element between them
        if node.nodeType == node.TEXT_NODE and node.data.strip():
            return False  # Non-whitespace text between them
        node = node.nextSibling
    return False
