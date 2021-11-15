<script lang="ts">
    import placeholder from "../assets/placeholder.png";
    import { onMount } from "svelte";

    let coverelem: HTMLImageElement;

    onMount(() => {
        coverelem.onerror = () => {
            coverelem.src = placeholder
        }
    })

    export let coversrc = placeholder;
    export let title = 'Unknown Title';
    export let album = 'Unknown Album';
    export let artist = 'Unknown Artist';

</script>

<article>
    <div class="song-preview" style="visibility: visible;" song-index="403" type="song">
        <div class="sp-cover-placeholder"></div>
        <div class="sp-cover-wrap">
            <img alt="Selected Song cover" class="sp-cover" draggable="false" bind:this={coverelem} src="{coversrc}">
        </div>
        <div class="sp-title">{title}</div>
        <div class="sp-album">{album}</div>
        <div class="sp-artist">{artist}</div>
    </div>
</article>


<style>
    article {
        width: 100%;
    }
    .song-preview {
        display: grid;
        grid-template-rows: 0.3fr 1.5fr 0fr 0.8fr 0fr 0.8fr 0.3fr;
        grid-template-columns: 8rem 1fr;
        height: 8rem;
        width: 100%;
        grid-template-areas: 
        "cover spacer1"
        "cover title"
        "cover whatisthis"
        "cover artist"
        "cover album"
        "cover spacer2"
    }
    .sp-cover-wrap, .sp-cover-placeholder {
        grid-area: cover;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        margin: 0.5rem;
    }
    .sp-cover-placeholder {
        background-image: url("img/placeholder.png");
        border-radius: 0.5rem;
    }
    .sp-cover {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        object-fit: contain;
    }
    .sp-title {
        grid-area: title;
        font-size: 1.3rem;
        padding-top: 0.5rem;
    }
    .sp-artist {
        grid-area: artist;
        display: flex;
        align-items: center;
    }
    .sp-album {
        grid-area: album;
        display: flex;
        align-items: center;
    }
    .sp-title, .sp-artist, .sp-album {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
</style>