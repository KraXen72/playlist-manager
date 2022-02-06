<script lang="ts">
    import placeholder from "$assets/placeholder.png";
    import { onMount } from "svelte";

    let coverelem: HTMLImageElement;

    export let coversrc = placeholder;
    export let title = 'Unknown Title';
    export let album = 'Unknown Album';
    export let artist = 'Unknown Artist';
    
    let inactive = true
    //let titl = ""
    $: inactive = title !== 'Unknown Title' ? false : true
    //$: titl = window.btoa(title)

</script>

<article>
    <div class="song-preview" class:hidden-f={inactive} song-index="403" type="song">
        <img alt="file exist test" src={coversrc} hidden 
        on:load={() => {coverelem.src = coversrc}} 
        on:error={() => {coverelem.src = placeholder}}>
        <div class="sp-cover-placeholder"></div>
        <div class="sp-cover-wrap">
            <img alt="Selected Song cover" class="sp-cover" draggable="false" bind:this={coverelem}>
        </div>
        <div class="sp-title">{title}</div>
        <div class="sp-album" title={album}>{album}</div>
        <div class="sp-artist">{@html artist}</div>
    </div>
</article>


<style>
    article {
        width: 100%;
    }
    .song-preview {
        display: grid;
        grid-template-rows: 0.6rem 1.5fr 0.8fr 0.8fr 0.6rem;
        grid-template-columns: 8rem 1fr;
        /*height: 8rem;*/
        width: 100%;
        grid-template-areas: 
        "cover spacer1"
        "cover title"
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
        border-radius: 0.5rem;
    }
    .sp-cover {
        width: 100%;
        height: 100%;
        border-radius: 10px;
        object-fit: contain;
    }
    .sp-cover, .sp-cover-placeholder, .sp-cover-placeholder {
        border-radius: 10px;
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