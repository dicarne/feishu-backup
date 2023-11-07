<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { testLocalServer } from "./api";
const router = useRouter()
onMounted(async () => {
    let localmode = false
    if (await testLocalServer()) {
        localmode = true
    }
    const redirect = window.localStorage.getItem(localmode ? "redirect-url.local" : "redirect-url.public")
    if (redirect === null) {
        router.push('/config')
    } else {
        window.location.replace(redirect)
    }
})
</script>