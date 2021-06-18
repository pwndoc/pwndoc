# Changelog

## 0.3.0 (2021-06-07)

### Enhancements

- Add Settings feature with image border [`74cb76c`](https://github.com/pwndoc/pwndoc/commit/74cb76c92e78234e156e70693dd635a58fb66ea1)
    -  It is now possible to enable and manage color of border on images generated in the report
- Add Trim to all strings saved in database [`011d9d2`](https://github.com/pwndoc/pwndoc/commit/011d9d2b5c05cc5925af9478da0e0bee77f8aa93)
    - Avoid issues like additionnal spaces in titles
- Add Company creation directly from Audit General [`1b28a21`](https://github.com/pwndoc/pwndoc/commit/1b28a218172d9b9e38d4a3cb39c0d563ccad95fb)
    - Update select with input filtering
    - If Company does not exist it will be created upon saving in Audit General section (make sure to tap enter to add the company)
- Add creator to new vulnerability from finding [`5173b07`](https://github.com/pwndoc/pwndoc/commit/5173b0752271f2f71e3fb7f56e7a60d0080230ac)
    - Like for vulnerablities updates, creator is now visible when editing newly created vulnerability

### Fixed

- Fix editor affix issue in vulnerabilities modals [`9e5d0c`](https://github.com/pwndoc/pwndoc/commit/9e5d0c64e418a6dca1f53f66365bc87ba2fa9af8)
    - Disable affix to avoid issues

## 0.2.0 (2021-05-21)

### Enhancements

- Add new Custom Field Components [`972641f`](https://github.com/pwndoc/pwndoc/commit/972641f8932ad046f3970f9bdb3bc10a22b5997c)
    - Checkbox
    - Date
    - Radio
    - Select
    - Select Multiple
- Add new customFields to report generation data [`404420d`](https://github.com/pwndoc/pwndoc/commit/404420dae58f582082ad2bb13904b402b9dccb1e)
- Add affix by default for all HTML editors [`6d50b13`](https://github.com/pwndoc/pwndoc/commit/6d50b1365649b281ed7ef5549de1683f34d5945e)

### Removed

- Remove Audit Section create and delete [`30a1563`](https://github.com/pwndoc/pwndoc/commit/30a1563231fb255198a1f2c16f64810fbfa0c271)
    - Not needed anymore since automatically handled by Audit Type

### Fixed

- Fix custom-fields rules validation on multiple options [`8d6edeb`](https://github.com/pwndoc/pwndoc/commit/8d6edeb8c0a9a70af503ef3ecab10ad42663b73b)
- Fix Audits List search filter [`e254603`](https://github.com/pwndoc/pwndoc/commit/e254603b9ef8d64b228cc8f623cc7bee1c0281de)
    - Language match is fixed
    - Company is changed to an exact match

### Merged

- Doc Update: Detailed how to import a network scan [`#115`](https://github.com/pwndoc/pwndoc/pull/115)

## 0.1.0 (2021-05-11)

### Enhancements

- Update Audit Types and Audit Creation [`1de6353`](https://github.com/pwndoc/pwndoc/commit/1de6353b9e9a6f12567ccb12a179816392dcbafc)
    - Audit Types are now linked to Templates and Sections
    - An Audit can then be customized depending on its Audit Type
    - Template selection when creating an Audit is now replaced by Audit Type
    - Sections are automatically added when creating the Audit based on the Audit Type
- Add Section Customization [`7225972`](https://github.com/pwndoc/pwndoc/commit/72259724905c2fa246209807e2e41ef46ec3703d)
    - Sections are now entirely made of Custom Fields allowing complete customization
    - Each Section can be customized in the `Custom Fields` tab
    - Default Text can be set for each Custom Field for all languages available

### Removed

- Manually adding sections in an Audit has been removed
- Languages for Audit Types and Custom Sections have been removed

### BEAKING CHANGES

- Old Default Text in `Custom Sections` tab won't be available anymore. Back it up before updating
- Since Sections can't be added manually anymore, any Audit in progress should be finished or Sections added to them before updating