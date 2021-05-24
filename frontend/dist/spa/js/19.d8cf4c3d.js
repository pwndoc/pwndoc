(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[19],{f657:function(e,t,a){"use strict";a.r(t);var n=function(){var e=this,t=e.$createElement,a=e._self._c||t;return a("div",[a("div",{staticClass:"row"},[a("div",{staticClass:"col-md-10 col-12 offset-md-1 q-mt-md"},[a("q-table",{staticClass:"sticky-header-table",attrs:{"card-class":"bg-grey-1","table-header-class":"bg-grey-1",columns:e.dtHeaders,data:e.companies,filter:e.search,"filter-method":e.customFilter,pagination:e.pagination,"row-key":"name",loading:e.loading},on:{"update:pagination":function(t){e.pagination=t},"row-dblclick":e.dblClick},scopedSlots:e._u([{key:"top",fn:function(){return[a("q-space"),a("q-btn",{attrs:{unelevated:"",label:"Add Company",color:"secondary","no-caps":""},on:{click:function(t){e.cleanCurrentCompany(),e.$refs.createModal.show()}}})]},proxy:!0},{key:"top-row",fn:function(t){return[a("q-tr",[a("q-td",{staticStyle:{width:"50%"}},[a("q-input",{attrs:{dense:"",color:"secondary",label:"Search...",clearable:"",outlined:"","bg-color":"white"},model:{value:e.search.name,callback:function(t){e.$set(e.search,"name",t)},expression:"search.name"}})],1),a("q-td"),a("q-td")],1)]}},{key:"body-cell-logo",fn:function(t){return a("q-td",{},[t.row.logo?a("img",{staticStyle:{"max-height":"42px","max-width":"42px"},attrs:{src:t.row.logo}}):e._e()])}},{key:"body-cell-action",fn:function(t){return a("q-td",{staticStyle:{width:"1px"}},[a("q-btn",{attrs:{size:"sm",flat:"",color:"primary",icon:"fa fa-edit"},on:{click:function(a){e.clone(t.row),e.$refs.editModal.show()}}},[a("q-tooltip",{attrs:{anchor:"bottom middle",self:"center left",delay:500,"content-class":"text-bold"}},[e._v("Edit")])],1),a("q-btn",{attrs:{size:"sm",flat:"",color:"negative",icon:"fa fa-trash"},on:{click:function(a){return e.confirmDeleteCompany(t.row)}}},[a("q-tooltip",{attrs:{anchor:"bottom middle",self:"center left",delay:500,"content-class":"text-bold"}},[e._v("Delete")])],1)],1)}},{key:"bottom",fn:function(t){return[1===e.companies.length?a("span",[e._v("1 Company")]):a("span",[e._v(e._s(e.companies.length)+" Companies")]),a("q-space"),a("span",[e._v("Results per page:")]),a("q-select",{staticClass:"q-px-md",attrs:{options:e.rowsPerPageOptions,"emit-value":"","map-options":"",dense:"","options-dense":"","options-cover":"",borderless:""},model:{value:e.pagination.rowsPerPage,callback:function(t){e.$set(e.pagination,"rowsPerPage",t)},expression:"pagination.rowsPerPage"}}),a("q-pagination",{attrs:{input:"",max:t.pagesNumber},model:{value:e.pagination.page,callback:function(t){e.$set(e.pagination,"page",t)},expression:"pagination.page"}})]}}])})],1)]),a("q-dialog",{ref:"createModal",attrs:{persistent:""},on:{hide:function(t){return e.cleanErrors()}}},[a("q-card",{staticClass:"bg-grey-1",staticStyle:{width:"800px"}},[a("q-bar",{staticClass:"bg-primary text-white"},[a("div",{staticClass:"q-toolbar-title"},[e._v("\n                Add Company\n            ")]),a("q-space"),a("q-btn",{attrs:{dense:"",flat:"",icon:"close"},on:{click:function(t){return e.$refs.createModal.hide()}}})],1),a("q-card-section",[a("div",{staticClass:"row"},[a("q-input",{staticClass:"col-md-12",attrs:{label:"Name *",autofocus:"",error:!!e.errors.name,"error-message":e.errors.name,outlined:"","bg-color":"white"},on:{keyup:function(t){return!t.type.indexOf("key")&&e._k(t.keyCode,"enter",13,t.key,"Enter")?null:e.createCompany()}},model:{value:e.currentCompany.name,callback:function(t){e.$set(e.currentCompany,"name",t)},expression:"currentCompany.name"}}),a("q-uploader",{ref:"addUploader",staticClass:"col-md-12",attrs:{url:"",label:"Logo",accept:".gif,.jpg,.jpeg,.png","hide-upload-btn":""},on:{added:e.handleImage}})],1)]),a("q-card-actions",{attrs:{align:"right"}},[a("q-btn",{attrs:{color:"primary",outline:""},on:{click:function(t){return e.$refs.createModal.hide()}}},[e._v("Cancel")]),a("q-btn",{attrs:{color:"secondary",unelevated:""},on:{click:function(t){return e.createCompany()}}},[e._v("Create")])],1)],1)],1),a("q-dialog",{ref:"editModal",attrs:{persistent:""},on:{hide:function(t){return e.cleanErrors()}}},[a("q-card",{staticClass:"bg-grey-1",staticStyle:{width:"800px"}},[a("q-bar",{staticClass:"bg-primary text-white"},[a("div",{staticClass:"q-toolbar-title"},[e._v("\n                Edit Company\n            ")]),a("q-space"),a("q-btn",{attrs:{dense:"",flat:"",icon:"close"},on:{click:function(t){return e.$refs.editModal.hide()}}})],1),a("q-card-section",[a("div",{staticClass:"row"},[a("q-input",{ref:"nameInput",staticClass:"col-md-12",attrs:{label:"Name *",autofocus:"",error:!!e.errors.name,"error-message":e.errors.name,outlined:"","bg-color":"white"},on:{keyup:function(t){return!t.type.indexOf("key")&&e._k(t.keyCode,"enter",13,t.key,"Enter")?null:e.updateCompany()}},model:{value:e.currentCompany.name,callback:function(t){e.$set(e.currentCompany,"name",t)},expression:"currentCompany.name"}}),a("q-uploader",{ref:"addUploader",staticClass:"col-md-12",attrs:{url:"",label:"Logo",accept:".gif,.jpg,.jpeg,.png","hide-upload-btn":""},on:{added:e.handleImage}})],1)]),a("q-card-actions",{attrs:{align:"right"}},[a("q-btn",{attrs:{color:"primary",outline:""},on:{click:function(t){return e.$refs.editModal.hide()}}},[e._v("Cancel")]),a("q-btn",{attrs:{color:"secondary",unelevated:""},on:{click:function(t){return e.updateCompany()}}},[e._v("Update")])],1)],1)],1)],1)},o=[],r=(a("b0c0"),a("436b")),i=a("2a19"),s=a("e3fa"),l=a("6fbe"),c={data:function(){return{companies:[],loading:!0,dtHeaders:[{name:"name",label:"Name",field:"name",align:"left",sortable:!0},{name:"logo",label:"Logo",field:"logo",align:"left",sortable:!0},{name:"action",label:"",field:"action",align:"left",sortable:!1}],pagination:{page:1,rowsPerPage:25,sortBy:"name"},rowsPerPageOptions:[{label:"25",value:25},{label:"50",value:50},{label:"100",value:100},{label:"All",value:0}],search:{name:""},customFilter:l["a"].customFilter,errors:{name:""},currentCompany:{name:"",logo:""},idUpdate:""}},mounted:function(){this.getCompanies()},methods:{getCompanies:function(){var e=this;this.loading=!0,s["a"].getCompanies().then((function(t){e.companies=t.data.datas,e.loading=!1})).catch((function(e){console.log(e)}))},createCompany:function(){var e=this;this.cleanErrors(),this.currentCompany.name||(this.errors.lastname="Name required"),this.errors.name||s["a"].createCompany(this.currentCompany).then((function(){e.getCompanies(),e.$refs.createModal.hide(),i["a"].create({message:"Company created successfully",color:"positive",textColor:"white",position:"top-right"})})).catch((function(e){console.log(e),i["a"].create({message:"String"===typeof e?e:e.message,color:"negative",textColor:"white",position:"top-right"})}))},updateCompany:function(){var e=this;this.cleanErrors(),this.currentCompany.name||(this.errors.lastname="Name required"),this.errors.name||s["a"].updateCompany(this.idUpdate,this.currentCompany).then((function(){e.getCompanies(),e.$refs.editModal.hide(),i["a"].create({message:"Company updated successfully",color:"positive",textColor:"white",position:"top-right"})})).catch((function(e){i["a"].create({message:e.message,color:"negative",textColor:"white",position:"top-right"})}))},deleteCompany:function(e){var t=this;s["a"].deleteCompany(e).then((function(){t.getCompanies(),i["a"].create({message:"Company deleted successfully",color:"positive",textColor:"white",position:"top-right"})})).catch((function(e){i["a"].create({message:e.message,color:"negative",textColor:"white",position:"top-right"})}))},confirmDeleteCompany:function(e){var t=this;r["a"].create({title:"Confirm Suppression",message:"Company «".concat(e.name,"» will be permanently deleted"),ok:{label:"Confirm",color:"negative"},cancel:{label:"Cancel",color:"white"}}).onOk((function(){return t.deleteCompany(e._id)}))},clone:function(e){this.cleanCurrentCompany(),this.currentCompany.name=e.name,this.currentCompany.logo=e.logo,this.idUpdate=e._id},cleanErrors:function(){this.errors.name=""},cleanCurrentCompany:function(){this.currentCompany.name="",this.currentCompany.logo=""},handleImage:function(e){var t=this,a=e[0],n=new FileReader;n.onloadend=function(e){t.currentCompany.logo=n.result},n.readAsDataURL(a)},dblClick:function(e,t){this.clone(t),this.$refs.editModal.show()}}},d=c,p=a("2877"),m=Object(p["a"])(d,n,o,!1,null,null,null);t["default"]=m.exports}}]);