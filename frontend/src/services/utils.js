var _ = require('lodash')

export default {
  htmlEncode(html) {
    if(typeof(html) !== "string")  return "";
    
    var result = html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;img.+?src="(.*?)".+?alt="(.*?)".*?&gt;/g, '<img src="$1" alt="$2">')
    .replace(/&lt;p&gt;/g, '<p>')
    .replace(/&lt;\/p&gt;/g, '</p>')
    .replace(/&lt;pre&gt;/g, '<pre>')
    .replace(/&lt;\/pre&gt;/g, '</pre>')
    .replace(/&lt;b&gt;/g, '<b>')
    .replace(/&lt;\/b&gt;/g, '</b>')
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/&lt;i&gt;/g, '<i>')
    .replace(/&lt;\/i&gt;/g, '</i>')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>')
    .replace(/&lt;u&gt;/g, '<u>')
    .replace(/&lt;\/u&gt;/g, '</u>')
    .replace(/&lt;s&gt;/g, '<s>')
    .replace(/&lt;\/s&gt;/g, '</s>')
    .replace(/&lt;strike&gt;/g, '<strike>')
    .replace(/&lt;\/strike&gt;/g, '</strike>')
    .replace(/&lt;br&gt;/g, '<br>')
    .replace(/&lt;code&gt;/g, '<code>')
    .replace(/&lt;\/code&gt;/g, '</code>')
    .replace(/&lt;ul&gt;/g, '<ul>')
    .replace(/&lt;\/ul&gt;/g, '</ul>')
    .replace(/&lt;ol&gt;/g, '<ol>')
    .replace(/&lt;\/ol&gt;/g, '</ol>')
    .replace(/&lt;li&gt;/g, '<li>')
    .replace(/&lt;\/li&gt;/g, '</li>')
    .replace(/&lt;h1&gt;/g, '<h1>')
    .replace(/&lt;\/h1&gt;/g, '</h1>')
    .replace(/&lt;h2&gt;/g, '<h2>')
    .replace(/&lt;\/h2&gt;/g, '</h2>')
    .replace(/&lt;h3&gt;/g, '<h3>')
    .replace(/&lt;\/h3&gt;/g, '</h3>')
    .replace(/&lt;h4&gt;/g, '<h4>')
    .replace(/&lt;\/h4&gt;/g, '</h4>')
    .replace(/&lt;h5&gt;/g, '<h5>')
    .replace(/&lt;\/h5&gt;/g, '</h5>')
    .replace(/&lt;h6&gt;/g, '<h6>')
    .replace(/&lt;\/h6&gt;/g, '</h6>')

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
          var searchString = (_.get(row, key) || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          var termString = (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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
  }
}