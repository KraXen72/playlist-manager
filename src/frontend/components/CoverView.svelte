<script lang="ts">
    import IconButton from '@smui/icon-button';
    import { viewCoverPath } from '$common/stores';

    export let src = ""

    function _close() {
        $viewCoverPath = false
        src = ""
    }
</script>

<div id="view-cover">
    <div class="close-wrapper">
        <IconButton class="material-icons" on:click={_close}>close</IconButton>
    </div>
    <img {src} alt="{src}" draggable="false"/>
</div>

<style>
    #view-cover {
        padding: 0.5rem;
        position: relative;
    }
    #view-cover img {
        max-width: 100%;
        border-radius: 0.5rem;
        user-select: none !important;
    }

    .close-wrapper {
        width: min-content;
        height: min-content;
        background: #a3a5aa;
        color: black;
        border-radius: 100%;

        position: absolute;
        top: 1.5rem;
        right: 1.5rem;

        opacity: 1;
        transition: opacity .2s;
    }
    #view-cover:hover .close-wrapper {
        opacity: .15;
    }
    .close-wrapper:hover {
        opacity: 1 !important;
    }
</style>