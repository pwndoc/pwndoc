var _ = require('lodash')
import { $t } from 'boot/i18n'

export default {
  htmlEncode(html) {
    if(typeof(html) !== "string")  return "";
    
    var result = html
    .replace(/</g, 'ΩΠг')
    .replace(/>/g, 'ΏΠг')
    .replace(/ΩΠгimg.+?src="(.*?)".+?alt="(.*?)".*?ΏΠг/g, '<img src="$1" alt="$2">')
    .replace(/ΩΠгlegend.+?label="(.*?)".+?alt="(.*?)".*?ΏΠг/g, '<legend label="$1" alt="$2">')
    .replace(/ΩΠг\/legendΏΠг/g, '</legend>')
    .replace(/ΩΠгpΏΠг/g, '<p>')
    .replace(/ΩΠг\/pΏΠг/g, '</p>')
    .replace(/ΩΠгpreΏΠг/g, '<pre>')
    .replace(/ΩΠг\/preΏΠг/g, '</pre>')
    .replace(/ΩΠгbΏΠг/g, '<b>')
    .replace(/ΩΠг\/bΏΠг/g, '</b>')
    .replace(/ΩΠгstrongΏΠг/g, '<strong>')
    .replace(/ΩΠг\/strongΏΠг/g, '</strong>')
    .replace(/ΩΠгiΏΠг/g, '<i>')
    .replace(/ΩΠг\/iΏΠг/g, '</i>')
    .replace(/ΩΠгemΏΠг/g, '<em>')
    .replace(/ΩΠг\/emΏΠг/g, '</em>')
    .replace(/ΩΠгuΏΠг/g, '<u>')
    .replace(/ΩΠг\/uΏΠг/g, '</u>')
    .replace(/ΩΠгsΏΠг/g, '<s>')
    .replace(/ΩΠг\/sΏΠг/g, '</s>')
    .replace(/ΩΠгstrikeΏΠг/g, '<strike>')
    .replace(/ΩΠг\/strikeΏΠг/g, '</strike>')
    .replace(/ΩΠгbrΏΠг/g, '<br>')
    .replace(/ΩΠгcodeΏΠг/g, '<code>')
    .replace(/ΩΠг\/codeΏΠг/g, '</code>')
    .replace(/ΩΠгulΏΠг/g, '<ul>')
    .replace(/ΩΠг\/ulΏΠг/g, '</ul>')
    .replace(/ΩΠгolΏΠг/g, '<ol>')
    .replace(/ΩΠг\/olΏΠг/g, '</ol>')
    .replace(/ΩΠгliΏΠг/g, '<li>')
    .replace(/ΩΠг\/liΏΠг/g, '</li>')
    .replace(/ΩΠгh1ΏΠг/g, '<h1>')
    .replace(/ΩΠг\/h1ΏΠг/g, '</h1>')
    .replace(/ΩΠгh2ΏΠг/g, '<h2>')
    .replace(/ΩΠг\/h2ΏΠг/g, '</h2>')
    .replace(/ΩΠгh3ΏΠг/g, '<h3>')
    .replace(/ΩΠг\/h3ΏΠг/g, '</h3>')
    .replace(/ΩΠгh4ΏΠг/g, '<h4>')
    .replace(/ΩΠг\/h4ΏΠг/g, '</h4>')
    .replace(/ΩΠгh5ΏΠг/g, '<h5>')
    .replace(/ΩΠг\/h5ΏΠг/g, '</h5>')
    .replace(/ΩΠгh6ΏΠг/g, '<h6>')
    .replace(/ΩΠг\/h6ΏΠг/g, '</h6>')
    .replace(/ΩΠг/g, '&lt;')
    .replace(/ΏΠг/g, '&gt;')

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
  }
}