from weighted_search import (
    extract_required_generation_tokens,
    product_matches_any,
    title_has_required_generations,
)


def test_search_17_matches_suffix_and_pro_max():
    req = extract_required_generation_tokens("17")
    assert req == ["17"]
    assert title_has_required_generations("iPhone 17e LCD", req)
    assert title_has_required_generations("iPhone 17 Pro Max Battery", req)
    assert title_has_required_generations("Samsung Galaxy S17 Ultra", req)
    assert not title_has_required_generations("iPhone 16 Pro Max", req)
    assert not title_has_required_generations("Part 117 kit", req)
    assert not title_has_required_generations("Cable 170mm", req)


def test_product_matches_any_17_variants():
    terms = ["17"]
    req = ["17"]
    assert product_matches_any(title="Apple iPhone 17e Screen", expanded=terms, required_tokens=req)
    assert product_matches_any(title="iPhone 17 Pro Max Housing", expanded=terms, required_tokens=req)
    assert not product_matches_any(title="iPhone 16e Screen", expanded=terms, required_tokens=req)
