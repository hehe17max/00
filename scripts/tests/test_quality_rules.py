import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from quality_rules import (
    concise_product_name,
    is_cn_page,
    product_name_ok,
    publication_rejection,
    source_preference,
    source_priority,
    supported_product,
)


class SourceChannelPolicyTest(unittest.TestCase):
    def test_cn_official_chinese_brand_priority(self):
        # 国产品牌：国内官方页 120 > 中性官网 110 > 外语镜像 90
        self.assertEqual(source_priority('https://www.maicong.cn/', 'cn_official'), 120)
        self.assertEqual(source_priority('https://www.mchose.store/', 'cn_official'), 110)
        self.assertEqual(source_priority('https://www.mchose.store/de/', 'cn_official'), 90)

    def test_origin_official_foreign_brand_priority(self):
        # 外国品牌：原属国官网 120 > 中性官网 110 > 中文镜像 100 > 外语镜像 90
        domains = ['razer.com', 'cn.razerzone.com']
        self.assertEqual(source_priority('https://www.razer.com/gaming-mice', 'origin_official', domains), 120)
        self.assertEqual(source_priority('https://cn.razerzone.com/mice', 'origin_official', domains), 100)
        self.assertEqual(source_priority('https://www.razer.com/fr/mice', 'origin_official', domains), 90)
        self.assertEqual(source_priority('https://example.com/x', 'origin_official', domains), 110)

    def test_cn_web_niche_brand_priority(self):
        # 小众品牌：国内官方页 120 > 国内零售/社区网页 115 > 全球官网 110 > 外语镜像 90
        self.assertEqual(source_priority('https://www.a-jazz.com/cn/x', 'cn_web'), 120)
        self.assertEqual(source_priority('https://item.jd.com/1000.html', 'cn_web'), 115)
        self.assertEqual(source_priority('https://attackshark.com/products/r86-he', 'cn_web'), 110)
        self.assertEqual(source_priority('https://attackshark.com/de/x', 'cn_web'), 90)

    def test_cn_subdomain_detected_as_chinese_page(self):
        self.assertTrue(is_cn_page('https://cn.razerzone.com/mice'))
        self.assertTrue(is_cn_page('https://www.darmoshark.cn/'))
        self.assertFalse(is_cn_page('https://www.razer.com/mice'))
        self.assertFalse(is_cn_page('https://row.hyperx.com/products/x'))

    def test_source_preference_defaults_by_origin(self):
        self.assertEqual(source_preference({'origin': '中国'}), 'cn_official')
        self.assertEqual(source_preference({'origin': '海外'}), 'origin_official')
        self.assertEqual(source_preference({'origin': '海外', 'source_preference': 'cn_web'}), 'cn_web')


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

    def test_missing_names_are_rejected_without_interrupting_scan(self):
        url = "https://www.gloriousgaming.com/products/model-o-mouse"
        for name in (None, "", "   ", {}, []):
            with self.subTest(name=name):
                self.assertEqual(publication_rejection(name, url, True, True),
                                 "missing_product_name")
        self.assertFalse(supported_product(None))
        self.assertEqual(publication_rejection("Glorious Model O Mouse", url, True), "")

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
