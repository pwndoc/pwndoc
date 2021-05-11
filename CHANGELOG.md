# Changelog

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