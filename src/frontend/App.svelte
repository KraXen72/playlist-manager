<script lang="ts">
    import AppTitle from '$components/AppTitle.svelte'
    import PlaylistTitle from '$components/PlaylistTitle.svelte'
    import SearchBar from '$components/SearchBar.svelte'
    import Sidebar from '$components/Sidebar.svelte'
	import PlaylistBar from '$components/PlaylistBar.svelte'
    import ButtonBar from '$components/ButtonBar.svelte'
    import DetailsView from '$components/DetailsView.svelte'
    import ExtraDetailsView from '$components/ExtraDetailsView.svelte';

    import { config, maindir, allSongs, detailsData, allPlaylists, allSongsAndPlaylists } from './common/stores'
    import { onDestroy } from 'svelte';

    const api = window.api

    //let prog = {c: 0, f: 0}
    //let progElem: HTMLDivElement

    // @ts-ignore
    $config = api.initOrLoadConfig("config.json")

    let searchDisabled = true

    console.log("mounted")
    const unsub = maindir.subscribe(val => {
            $allSongs = api.walker.songs($maindir, $config)
            console.log("fetched songs.")
            console.log("getting tags for songs...")
            //prog.f = $allSongs.length

            console.time('got tags in')

            api.tagSongs($allSongs).then(val => {
                $allSongs = val
                console.timeEnd("got tags in")
                searchDisabled = false
            })
            /*const tags = []
            for (let i = 0; i < $allSongs.length; i++) {
                const song = $allSongs[i];
                tags.push(
                    new Promise(async (resolve) => {
                        const tag = await api.getEXTINF(song.fullpath, song.filename, true, false, false)
                        $allSongs[song.index].tag = tag
                        prog.c += 1
                        progElem.style.width = `${Math.round((prog.c / prog.f) * 100)}%`
                        resolve("")
                    })
                )
            }
            Promise.all(tags).then(() => {
                console.timeEnd("got tags in")
                setTimeout(() => {progElem.style.opacity = "0"}, 500)
            })*/
        })
    onDestroy(unsub)
</script>


<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar completeFrom={$allSongs} disabled={searchDisabled}/>
    <Sidebar/>
	<PlaylistBar/>
	<ButtonBar/>
    <div id="main-content">
        <DetailsView {...$detailsData}/>
        <ExtraDetailsView hide={true}/>
    </div>
    
</main>
<!-- {Math.round((prog.c / prog.f) * 100)}% -->
<!--<div class="prog" bind:this={progElem}></div>-->
<style>
    main#main-grid {
        display: grid;
        width: 100vw;
        height: 100vh;
        grid-template: max-content 1fr max-content / minmax(18rem, 25%) minmax(18rem, 25%) 1fr;
        grid-template-areas: "AppTitle PlaylistTitle SearchBar"
        "Sidebar PlaylistBar DetailsView"
        "Sidebar PlaylistBar ButtonBar";
    }
    #main-content {
        grid-area: DetailsView;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        flex-direction: column;

        padding-right: 1rem;
        box-sizing: border-box;
    }
</style>

