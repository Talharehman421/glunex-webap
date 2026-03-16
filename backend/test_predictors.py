# ============================================================
# END-TO-END TEST — runs all 4 scenarios
# Run from backend/ folder:
#   python test_predictors.py
# ============================================================

from predictors.clinical  import predict_clinical
from predictors.lifestyle import predict_lifestyle
from predictors.fusion    import predict_fusion

print("=" * 60)
print("TEST 1: Clinical only (passthrough)")
print("=" * 60)

clin_result = predict_clinical(
    age             = 45,
    sex             = "Male",
    bmi             = 28.5,
    hba1c           = 6.8,
    blood_glucose   = 125,
    hypertension    = 1,
    heart_disease   = 0,
    smoking_history = "former",
    clinical_notes  = "Overweight patient with family history of diabetes"
)
print(f"p_clinical     : {clin_result['p_clinical']:.4f}")
print(f"p_clinical_raw : {clin_result['p_clinical_raw']:.4f}")
print(f"warnings       : {clin_result['warnings']}")

fusion1 = predict_fusion(p_clinical=clin_result["p_clinical"])
print(f"p_final        : {fusion1['p_final']}")
print(f"risk_category  : {fusion1['risk_category']}")
print(f"variant_used   : {fusion1['variant_used']}")
print()

print("=" * 60)
print("TEST 2: Lifestyle only (passthrough)")
print("=" * 60)

life_result = predict_lifestyle(
    general_health  = 3,
    bmi             = 29.2,
    high_bp         = 1,
    high_chol       = 1,
    smoker          = 1,
    phys_activity   = 0,
    fruits          = 1.0,
    veggies         = 1.0,
    hvy_alcohol     = 0,
    ment_hlth       = 5,
    phys_hlth       = 3,
    diff_walk       = 0,
    any_healthcare  = 1,
    no_doc_cost     = 0,
    heart_disease   = 0,
    stroke          = 0,
    sex             = 1,
    age             = 9,
    education       = 4,
    income          = 5,
)
print(f"p_lifestyle     : {life_result['p_lifestyle']:.4f}")
print(f"p_lifestyle_raw : {life_result['p_lifestyle_raw']:.4f}")
print(f"warnings        : {life_result['warnings']}")

fusion2 = predict_fusion(p_lifestyle=life_result["p_lifestyle"])
print(f"p_final         : {fusion2['p_final']}")
print(f"risk_category   : {fusion2['risk_category']}")
print(f"variant_used    : {fusion2['variant_used']}")
print()

print("=" * 60)
print("TEST 3: Clinical + Lifestyle fusion")
print("=" * 60)

fusion3 = predict_fusion(
    p_clinical  = clin_result["p_clinical"],
    p_lifestyle = life_result["p_lifestyle"],
)
print(f"p_clinical      : {clin_result['p_clinical']:.4f}")
print(f"p_lifestyle     : {life_result['p_lifestyle']:.4f}")
print(f"p_final         : {fusion3['p_final']}")
print(f"risk_category   : {fusion3['risk_category']}")
print(f"variant_used    : {fusion3['variant_used']}")
print(f"normalised      : {fusion3['normalised_scores']}")
print()

print("=" * 60)
print("TEST 4: Fusion result sanity checks")
print("=" * 60)

# Check passthrough works correctly
assert fusion1["variant_used"] == "clin_only",  "FAIL: clinical passthrough variant wrong"
assert fusion2["variant_used"] == "life_only",  "FAIL: lifestyle passthrough variant wrong"
assert fusion3["variant_used"] == "clin_life",  "FAIL: clin+life fusion variant wrong"

# Check p_final is in [0,1]
for name, result in [("clinical", fusion1), ("lifestyle", fusion2), ("fusion", fusion3)]:
    assert 0.0 <= result["p_final"] <= 1.0, f"FAIL: {name} p_final out of range"

# Check passthrough returns exact calibrated probability
assert abs(fusion1["p_final"] - clin_result["p_clinical"]) < 0.0001, \
    "FAIL: clinical passthrough should return p_clinical unchanged"
assert abs(fusion2["p_final"] - life_result["p_lifestyle"]) < 0.0001, \
    "FAIL: lifestyle passthrough should return p_lifestyle unchanged"

print("=" * 60)
print("TEST 5: All 3 modalities (clinical + lifestyle + gene)")
print("=" * 60)

from predictors.gene import predict_gene

gene_result = predict_gene("test_gene_input.csv")
print(f"p_gene         : {gene_result['p_gene']:.4f}")
print(f"p_gene_raw     : {gene_result['p_gene_raw']:.4f}")
print(f"p_gene_norm    : {gene_result['p_gene_norm']:.4f}")
print(f"warnings       : {gene_result['coverage_warnings']}")

fusion4 = predict_fusion(
    p_clinical  = clin_result["p_clinical"],
    p_lifestyle = life_result["p_lifestyle"],
    p_gene      = gene_result["p_gene"],
)
print(f"p_final        : {fusion4['p_final']:.4f}")
print(f"risk_category  : {fusion4['risk_category']}")
print(f"variant_used   : {fusion4['variant_used']}")
print(f"normalised     : {fusion4['normalised_scores']}")

assert fusion4["variant_used"] == "all_three", "FAIL: all_three variant not selected"
assert 0.0 <= fusion4["p_final"] <= 1.0, "FAIL: p_final out of range"
print("All3 sanity checks PASSED")


print("All sanity checks PASSED")
print()
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)