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

  syncEditors: function(refs) {
    // Update all basic-editor when noSync is necessary for performance (text with images). 
    Object.keys(refs).forEach(key => {
        if (key.startsWith('basiceditor_') && refs[key]) // ref must start with 'basiceditor_'
            (Array.isArray(refs[key]))? refs[key].forEach(elt => elt.updateHTML()) : refs[key].updateHTML()
    })
  }
}