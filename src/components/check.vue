<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
const router = useRouter()
onMounted(() => {
    const redirect = window.localStorage.getItem("redirect-url")
    if (redirect === null) {
        router.push('/config')
    } else {
        window.location.replace(redirect)
    }
})
</script>