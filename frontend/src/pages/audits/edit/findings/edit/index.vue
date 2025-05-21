<template src='./edit.html'></template>

<script src='./edit.js'></script>

<style scoped>
.sortable-drag img {
    position: relative;
    max-width: 600px!important;
    max-height: 600px!important;
}
.paragraph-ghost .sortable-ghost img {
    max-width: 600px!important;
    max-height: 600px!important;
}

.after-class {
    height: calc(100vh - 132px)!important;
}

.top-fixed {
    position: fixed;
    top: 100px;
    z-index: 1000;
}

.scrollarea-comments {
    height: calc(100vh - 152px)!important;
}

.scrollarea-comments-retest {
    height: calc(100vh - 104px)!important;
}

.content {
    margin-top: 100px;
}

.content-retest {
    margin-top: 50px;
}
</style>