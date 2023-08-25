<template>
<div>
    <router-view />     
</div>
</template>

<script>
import Breadcrumb from 'components/breadcrumb'

export default {
    components: {
        Breadcrumb
    },
    mounted: function() {
        this.$socket.connect();
    }
}
</script>

