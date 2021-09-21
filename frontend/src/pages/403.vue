<template>
  <div class="fixed-center text-center">
    <p>
      <img
        src="~assets/sad.svg"
        style="width:30vw;max-width:150px;"
      >
    </p>
    <p class="text-faded">{{message}} <strong>(403)</strong></p>
    <q-btn
      color="secondary"
      style="width:200px;"
      @click="$router.push('/')"
    >{{$t('goBack')}}</q-btn>
  </div>
</template>

<script>
export default {
  data () {
    return {
      message: ''
    }
  },

  created: function() {
      this.message = this.$route.params.error;
  }
}
</script>