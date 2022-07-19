# Changelog

## 0.5.3 (2022-07-19)

### Enhancements

- Add Dark mode theme [`9564911`](https://github.com/pwndoc/pwndoc/commit/956491149f63cabd430039a72135c760b1614f4b)
- Update CVSS calculation [`5cb9661`](https://github.com/pwndoc/pwndoc/commit/5cb9661e9973667834a9fcc03c5fe62ec999665d)
  - Use First roundup function for impact and exploitability subscores
  - Add temporal colors for template
  - Add environmental colors for template
  - Add environmental impact and exploitability subscores
  - Update sorting with Environmental and Temporal scores
  - Removed cvssScore and cvssSeverity from models since now they are always calculated based on the vector string
- Update websockets to reconnect after a disconnect [`0813945`](https://github.com/pwndoc/pwndoc/commit/0813945961ec2bd15c7af18b18e3af0109b82387)
  - Updated socket.io to last version
  - If server connection is lost websockets for Audit menu will reconnect automatically
- Add dynamic check for backend connection [`2673749`](https://github.com/pwndoc/pwndoc/commit/2673749cd02b8bc0827af35d97d14b7e93c33783)
  - If websocket disconnect then a loading message appear until it reconnects
- Remove user deletion to prevent missing references [`6e3de55`](https://github.com/pwndoc/pwndoc/commit/6e3de550da77b9ecf4444b31b3a0595fcb1a0b4d)
  - Deleting users breaked their links to different objects like audits.
  - It's better to use the recent disable feature to avoid orphan objects

### Merged

- Added a short name to companies and included it on reports [`cd72648`](https://github.com/pwndoc/pwndoc/commit/cd72648c504c4190f364d9fcea6b471e13290092)
- Create filter to sort findings in document [`a551379`](https://github.com/pwndoc/pwndoc/commit/a551379830d2652a9daef09a7a95e5c0bf915fcd)
- Add i18n fr-FR translation [`260f5dc`](https://github.com/pwndoc/pwndoc/commit/260f5dcc5c3c30be65fd03375c277ba170ee5ddf)
- i18n de-DE: Adding German Interface Translation [`48dad91`](https://github.com/pwndoc/pwndoc/commit/48dad91d9ed36728db03bf24eb5f3112385a96e7)
- Add 'Disable user' feature [`a8d6d49`](https://github.com/pwndoc/pwndoc/commit/a8d6d49809de0e1a9cfa1d7baefff849afdd6a8f)

### Fixed

- Correctly reject promise when wrong password on profile [`711dbf1`](https://github.com/pwndoc/pwndoc/commit/711dbf18d05dcb6e3b6b892eb649a957c1f18be7)
- Fix client selection issue (#242) [`f8e6c27`](https://github.com/pwndoc/pwndoc/commit/f8e6c278c2e67d353a656c04d034af8080eb6ff3)

### Special Thanks for their support

[<img src="https://github.com/nobox910.png" height="20" />](https://github.com/nobox910) @nobox910


## 0.5.2 (2022-01-12)

### Fixed

- Update Default Template [`5764df8`](https://github.com/pwndoc/pwndoc/commit/5764df8b853db851914ee5f47359973ba02ba50a)

- Fix template count function [`31b6577`](https://github.com/pwndoc/pwndoc/commit/31b6577eb9a4382eb2b6ecf8807421b044d897fa)
  - Close #237

- Fix numbering issue in ooxml conversion [`cb9883c`](https://github.com/pwndoc/pwndoc/commit/cb9883c99073ce29c2c04a8a8ca49fd256370b94)
  - Close #236

## 0.5.1 (2022-01-06)

### Fixed

- Fix break call from docxjs [`02c8b0b`](https://github.com/pwndoc/pwndoc/commit/02c8b0bd2f38c4f026eabdcd3827e6c219f9a6ef)
- Fix HTML encoding issue in HTML editor [`d0d12dc`](https://github.com/pwndoc/pwndoc/commit/d0d12dc98a4be7ea866395e8379b75994cdcf47d)

## 0.5.0 (2022-01-06)

### Enhancements

- Update convertDateLocale filter [`876b96d`](https://github.com/pwndoc/pwndoc/commit/876b96d36e8d92633cdfc5064ab2d10dbbc37cd5)
    - Changed numeric to 2-digit to have 2021/08/01 instead of 2021/8/1
- Update default template [`51e48ed`](https://github.com/pwndoc/pwndoc/commit/51e48edd4c2d7b313eacb58f901c382871696b10)
    - Removed some {-w:p} tags that could cause errors with images
- Handle Categories order in findings [`08748f2`](https://github.com/pwndoc/pwndoc/commit/08748f226fd67771b5cca44d1a08701f2f923d82)
    - Fix Categories order using their position in Custom Data
    - Add "categories" data available in report template to generate findings dynamically by Category: `categories: {categoryName:<name>, categoryFindings:<[Array of Findings]>}`
- Add Caption feature in HTML Editor [`f93fbdd`](https://github.com/pwndoc/pwndoc/commit/f93fbddb613b9a6bc2e8213e099b2c7e3d476b4f)
    - Caption labels are dynamic and can be added in the `Settings` page (Default will be `Figure`)
    - Caption can be added anywhere in the Editor
    - It will render `<label> 1 - xxx` in Word generated document (select all + F9 to update numbering in Word)
    - The style in the generated report can be customised by creating/editing the `Caption` style in the Word template  
- Update CVSS calculator [`9baf6ef`](https://github.com/pwndoc/pwndoc/commit/9baf6efa2d7f662d7469d4de08bb93a44600ddec)
    - Update to version 3.1
    - Add Temporal and environmental scores
    - Add impact and exploitability scores
    - Add tooltips description
- Add translation for report data [`88d89f0`](https://github.com/pwndoc/pwndoc/commit/88d89f07a407820f4f8e035bedaf2f574e08876b)
    - Dictionary files can be used to translate some data automatically depending on audit language
    - A dictionary draft for French can be found in [`backend/src/translate`](https://github.com/pwndoc/pwndoc/tree/master/backend/src/translate)
    - The name of the folder should correspond to the name of the locale defined in `Data > Custom Data > Languages`
    - Angular expression can be directly used in report template: `{input | translate:'locale'}`
    - The following data will be automatically translated based on the audit language:
        - cvssObj
        - auditType
        - findings[i].vulnType
        - findings[i].category
        - sections[i].name
- Add Category creation on vulnerabilities import [`0e97ffc`](https://github.com/pwndoc/pwndoc/commit/0e97ffc612cbeee154bfd53a22205af852db5f57)
    - When importing vulnerabilities, if a Category does not exist it will be created

### Merged

- Add Internationalization for Frontend [`a239bb6`](https://github.com/pwndoc/pwndoc/commit/a239bb60c2e3ab1feaed4298d250894d22db0487)
    - Language can be changed in `Settings` page
    - Currently supported languages: `en-US` and `zh-CN`
- Add TOTP feature [`c1aaf12`](https://github.com/pwndoc/pwndoc/commit/c1aaf12e0f47b6b0d3e7c8d05d6ff5dc473d18ce)
    - TOTP can be enabled in the user profile page
- Add Sub-Templating [`21e583b`](https://github.com/pwndoc/pwndoc/commit/21e583b2798001dbd75529d5e9d250c2d450ca74)
    - Add sub templating with delimiter `{_{xxx}_}` for exemple if you put `{_{client.firstname}_}` in description during the generation it will be replace with the client firstname. If var not found/undefined the system will replace `{_{client.firstname}_}` by nothing
- Update python to python3 in apk repo[`efcbc51`](https://github.com/pwndoc/pwndoc/commit/efcbc51629d6fb8ea0c7f04e50a6731324e2d11f)
- Add Email and Phone fields for Collaborators [`9a0ab63`](https://github.com/pwndoc/pwndoc/commit/9a0ab63a60a81dc50ff2bef0a814e2c83b0c6678)

### Fixed
- Update : python no longer existe in apk repo now it's python3 [`91d10f4`](https://github.com/pwndoc/pwndoc/commit/91d10f49f287e6a9cc429602ee4953ae83c54ded)
- Fix issues related to sub-templating [`631bc0a`](https://github.com/pwndoc/pwndoc/commit/631bc0a8571879b3683b2d160d09075763c3d345)

### UPDATE ATTENTION

- Changes to CVSS data require to update Word templates to avoid report generation errors
    - Replace `{cvssv3}` by `{cvss.vectorString}`
    - Replace `{cvssScore}` by `{cvss.baseMetricScore}`
    - Replace `{cvssSeverity}` by `{cvss.baseSeverity}`
    - Replace `{@cvssColor}` by `{@cvss.cellColor}`
    ```
    findings[i]: //before
    {
        cvssv3
        cvssScore
        cvssSeverity
        cvssColor
    }

    findings[i]: // now
    {
        cvss: {
            vectorString
            baseMetricScore
            baseSeverity
            temporalMetricScore
            temporalSeverity
            environmentalMetricScore
            environmentalSeverity
            baseImpact
            baseExploitability
            cellColor
        }
    }
    ```

## 0.4.0 (2021-08-23)

### Enhancements

- Update JWT generation [`15f3dc0`](https://github.com/pwndoc/pwndoc/commit/15f3dc0e212eda465e05fda0feb002d1bce2939d)
    - JWT is now dynamically generated
    - config files moved to on location
- Update Session management using refresh token [`ff1b868`](https://github.com/pwndoc/pwndoc/commit/ff1b868cec55f5b6c7a91e15a2b0b1f4324121ab)
    - A refresh token has been introduced allowing to request for a new token
    - Token is now valid for 15min and refreshtoken for 7days
    - So now when updating a user (role or remove) it will take maximum 15min (or page refresh) to invalidate the old token
    - Each refresh token is associated with a sessionId allowing to have multiple sessions on different devices
- Add different options to sort Audit findings [`32dd337`](https://github.com/pwndoc/pwndoc/commit/32dd3373695dd1d3d4c1e6d045540ab06631f6d7)
    - The automatic sorting parameter can now be customized for each vulnerability category
    - Custom fields can be used as sorting parameter (input, date, radio and select)
    - Default sorting can be set in **Custom data > Vulnerability Categories**
    - Manual sorting of findings is also possible now with drag&drop

### Merged
- Add Audit reviews and approval feature [`02d144d`](https://github.com/pwndoc/pwndoc/commit/02d144db4b58aec98a9870f5b7743589754298ce). Thanks [`@lm-sec`](https://github.com/lm-sec) and [`@alexandre-lavoie`](https://github.com/alexandre-lavoie)
    - Add a new process (disabled by default) to handle Audit approbation
    - Update Settings
    - Add readonly visual on Audits when user cannot edit

### Fixed

- Fix issue in HTML editor [`63c6359`](https://github.com/pwndoc/pwndoc/commit/63c6359bbadfd220646e04972e9e8afa8051e0d2)
    - Toolbar styles could be applied by using their HTML tags directly in the editor resulting in visual bugs
- Fix issue in textarea-array component [`dd5b51f`](https://github.com/pwndoc/pwndoc/commit/dd5b51f18d7bd8ec67cb55fa4b1c298b5a8ebce9)
    - Removed trim function since it caused issues with resetting cursor at end of input when deleting and reaching a space. It is taken care of by the trim option in mongoose
- Fix database compatibility issue [`361cd0a`](https://github.com/pwndoc/pwndoc/commit/361cd0a8171bafc5cab3ab6db67b0d1f0f03832f)
    - Fix the mongodb version to avoid compatibility issue with newer versions for now

### UPDATE ATTENTION

- After updating, Settings will be reset to default

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