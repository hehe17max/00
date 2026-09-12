import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from quality_rules import concise_product_name, product_name_ok, publication_rejection, supported_product


class OfficialCatalogueQualityRulesTest(unittest.TestCase):
    def test_verbose_official_product_title_is_allowed_for_concising(self):
        title = (
            "iKF Show Pro Cat Headset Wireless Bluetooth Game Cute Girl Gaming "
            "Non-Sense Delay Custom Light Anime With Microphone Ultra-Long Battery "
            "Life Support Wired Connection iOS Android Game"
        )
        self.assertTrue(product_name_ok(title))

    def test_feature_words_do_not_turn_a_headset_into_an_accessory(self):
        self.assertTrue(supported_product(
            "iKF VP5 HiFi Monitor Headphone Game Esports Wired Headset 3.5MM With Microphone Cable"
        ))

    def test_real_accessories_are_still_rejected(self):
        self.assertFalse(supported_product(
            "Earmuffs for iKF V11 Pro Headphones Easy Replaceable Earpads"
        ))
        self.assertFalse(supported_product(
            "iKF Over-Ear Headphone Case Storage Bag King Universal T1"
        ))

    def test_official_shopify_catalog_is_valid_product_evidence(self):
        url = "https://ikfaudio.com/products/ikf-vp5"
        self.assertEqual(publication_rejection(
            "iKF VP5 HiFi Monitor Headphone", url, False, True
        ), "")
        self.assertEqual(publication_rejection(
            "iKF VP5 HiFi Monitor Headphone", url, False, False
        ), "missing_product_structured_data")

    def test_model_editions_remain_distinct(self):
        self.assertEqual(concise_product_name(
            "iKF", "iKF R1 Pop Wireless Bluetooth Headphones"
        ), "R1 Pop")
        self.assertEqual(concise_product_name(
            "iKF", "iKF V11 Pro 2.0 Wireless Gaming Headset"
        ), "V11 Pro 2.0")
        self.assertEqual(concise_product_name("iKF", "Mars / Mars"), "Mars")


if __name__ == "__main__":
    unittest.main()
