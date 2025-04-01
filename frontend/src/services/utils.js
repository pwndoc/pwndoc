var _ = require('lodash')
import { $t } from 'boot/i18n'
import DOMPurify from 'dompurify';

export default {
  htmlEncode(html) {
    if(typeof(html) !== "string")  return "";

    const ALLOWED_TAGS = [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'strike',
      'mark',
      'ul',
      'ol',
      'li',
      'code',
      'pre',
      'img',
      'legend',
    ]
    
    DOMPurify.setConfig({
      ALLOWED_TAGS: ALLOWED_TAGS,
    }
  );

    // Hook to enable image sources not having a valid URL.
    DOMPurify.addHook('uponSanitizeAttribute', function (node, data, config) {
      data.keepAttr = false // default to remove any attribute

      // Filter authorized attributes for <img> tags (<img src="..." alt="...">)
      if (node.tagName === 'IMG') { 
        if (data.attrName === 'src') {
          const pattern = /^[a-fA-F0-9]{24}$/; // Check if the `src` consists of exactly 24 hexadecimal characters
          const pattern_b64 = /^data:image\/.+base64,.+$/; // Check if the `src` is a base64 image (retrocompatibility)
          if (pattern.test(data.attrValue) || pattern_b64.test(data.attrValue))
            data.forceKeepAttr = true;
        }
        else if (data.attrName === 'alt') {
          data.forceKeepAttr = true; 
        }
      }
      // Filter authorized attributes for <legend> tags (<legend label="..." alt="...">)
      else if (node.tagName === 'LEGEND') {
        if (data.attrName === 'label' || data.attrName === 'alt')
          data.forceKeepAttr = true;
      }
      // Filter authorized attributes for <mark> tags (<mark data-color="..." style="...">)
      else if (node.tagName === 'MARK') {
        if (data.attrName === 'data-color' || data.attrName === 'style')
          data.forceKeepAttr = true;
      }
      // Filter authorized attributes for <code> tags (<code class="...")
      else if (node.tagName === 'CODE') {
        if (data.attrName === 'class') {
          const pattern = /^language-[a-zA-Z0-9\-]{1,}$/; // Check for highlight language value
          if (pattern.test(data.attrValue)) {
            data.forceKeepAttr = true;
          }
        }
      }
    });

    const result = DOMPurify.sanitize(html);
    return result
  },

  // Update all basic-editor when noSync is necessary for performance (text with images). 
  syncEditors: function(refs) {
    Object.keys(refs).forEach(key => {
      if (key.startsWith('basiceditor_') && refs[key]) // ref must start with 'basiceditor_'
        (Array.isArray(refs[key]))? refs[key].forEach(elt => elt.updateHTML()) : refs[key].updateHTML()
      else if (refs[key] && refs[key].$refs) // check for editors in child components
        this.syncEditors(refs[key].$refs)
    })
  },

  // Compress images to allow more storage in database since limit in a mongo document is 16MB
  resizeImg: function(imageB64) {
    return new Promise((resolve, reject) => {
      var oldSize = JSON.stringify(imageB64).length
      var max_width = 1920

      var img = new Image()
      img.src = imageB64
      img.onload = function() {
        //scale the image and keep aspect ratio
        var resize_width = (this.width > max_width) ? max_width : this.width
        var scaleFactor =  resize_width / this.width
        var resize_height = this.height * scaleFactor

        // Create a temporary canvas to draw the downscaled image on.
        var canvas = document.createElement("canvas")
        canvas.width = resize_width
        canvas.height = resize_height

        //draw in canvas
        var ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0, resize_width, resize_height)

        var result = canvas.toDataURL('image/jpeg')
        var newSize = JSON.stringify(result).length
        if (newSize >= oldSize)
          resolve(imageB64)
        else
          resolve(result)
      }
    })
  },

  customFilter: function(rows, terms) {
    var result = rows && rows.filter(row => {
        for (const [key, value] of Object.entries(terms)) { // for each search term
          var searchString = (_.get(row, key) || "")
          if (typeof searchString === "string")
            searchString = searchString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          var termString = (value || "")
          if (typeof termString === "string")
            termString = termString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          if (typeof searchString !== "string" || typeof termString !== "string")
            return searchString === termString
          if (searchString.indexOf(termString) < 0) {
            return false
          }
        }
        return true
    })
    return result
  },

  filterCustomFields: function(page, displaySub, customFields = [], objectFields = [], locale = "") {
    var cFields = []
    var display = []

    customFields.forEach(field => {
      switch (page) {
        case 'finding':
          display = ['finding', 'vulnerability']
          break
        case 'vulnerability':
          display = ['vulnerability']
          break
        case 'audit-general':
          display = ['general']
          break
        case 'section':
          display = ['section']
          break
      }

      if ((display.includes(field.display) && (field.displaySub === '' || field.displaySub === displaySub))) { // wanted field
        var fieldText = ''
        if (['select-multiple', 'checkbox'].includes(field.fieldType))
          fieldText = []
        if (locale && Array.isArray(field.text)) { // set default text for locale if it exists
          let textLocale = field.text.find(e => e.locale === locale)
          if (textLocale) fieldText = textLocale.value
        }
        for (var i=0;i<objectFields.length; i++) { // Set corresponding text value
          var customFieldId = ""
          if (typeof objectFields[i].customField === 'object')
            customFieldId = objectFields[i].customField._id
          else
            customFieldId = objectFields[i].customField
          if (customFieldId && customFieldId === field._id) { // found correct field for text
            if (objectFields[i].text){ // text already exists
                fieldText = objectFields[i].text
            }
            break
          }
        }

        cFields.push({
            customField: _.omit(field, ['text']),
            text: fieldText
        })
      }
    })

    return cFields
  },

  normalizeString: function(value) {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  },

  AUDIT_VIEW_STATE: { 
    "EDIT": 0, 
    "EDIT_READONLY": 1, 
    "REVIEW": 2, 
    "REVIEW_EDITOR": 3, 
    "REVIEW_APPROVED": 4, 
    "REVIEW_ADMIN": 5, 
    "REVIEW_ADMIN_APPROVED": 6,
    "REVIEW_READONLY": 7,
    "APPROVED": 8,
    "APPROVED_APPROVED": 9,
    "APPROVED_READONLY": 10
  },

  strongPassword: function(value) {
    var regExp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;
    if (regExp.test(value))
      return true
    return $t('msg.passwordComplexity')
  },

  // Return black or white color depending on background color
  getTextColor: function(bgColor) {
    var regex = /^#[0-9a-fA-F]{6}$/
    if (!regex.test(bgColor))
      return "#000000" //black

    var color = bgColor.substring(1, 7)
    var red = parseInt(color.substring(0, 2), 16) // hexToR
    var green = parseInt(color.substring(2, 4), 16) // hexToG
    var blue = parseInt(color.substring(4, 6), 16) // hexToB
    
    if ((red * 0.299) + (green * 0.587) + (blue * 0.114) > 186)
      return "#000000" //black
    else
      return "#ffffff" //white
  },

  getRelativeDate: function(date) {
    const now = new Date();
    const diff = now - new Date(date);

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) {
      return `${seconds} seconds ago`;
    }

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    }

    const hours = Math.floor(diff / 3600000);
    if (hours < 24) {
      return `${hours} hours ago`;
    }

    const days = Math.floor(diff / 86400000);
    if (days < 30) {
      return `${days} days ago`;
    }

    const months = Math.floor(diff / 2592000000);
    if (months < 12) {
      return `${months} months ago`;
    }

    const years = Math.floor(diff / 31536000000);
    return `${years} years ago`;
  },

  bytesToHumanReadable: function(bytes) {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(2)} ${sizes[i]}`;
  }
}