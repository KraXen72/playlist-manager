<script lang="ts">
    import AppTitle from '$components/AppTitle.svelte'
    import PlaylistTitle from '$components/PlaylistTitle.svelte'
    import SearchBar from '$components/SearchBar.svelte'
    import Sidebar from '$components/Sidebar.svelte'
	import PlaylistBar from '$components/PlaylistBar.svelte'
    import ButtonBar from '$components/ButtonBar.svelte'
    import DetailsView from '$components/DetailsView.svelte'
    import ExtraDetailsView from '$components/ExtraDetailsView.svelte';

    import { config, maindir, allSongs, detailsData, extraDetailsData, tagDB, allPlaylists, allSongsAndPlaylists } from './common/stores'
    import { onDestroy } from 'svelte';

    const api = window.api

    //let prog = {c: 0, f: 0}
    //let progElem: HTMLDivElement

    $config = api.initOrLoadConfig("config.json")
    let searchDisabled = true
    let localTagDB = $tagDB

    console.log("mounted")
    const unsub = maindir.subscribe(val => {
            $allSongs = api.walker.songs($maindir, $config)
            console.log("fetched songs. checking if we have cached tags...")

            $allPlaylists = api.walker.playlists($maindir, $allSongs.length)
            //console.log($allPlaylists)


            // ($allSongs.length > Object.keys($tagDB).length && Object.keys($tagDB).length > 0)
            localTagDB = api.initOrLoadConfig(`./db/${btoa($maindir)}.json`, {})

            //check if all songs have a cached tag already or nah.
            if ($allSongs.every(song => Object.keys(localTagDB).includes(song.filename))) {
                console.log(`all ${Object.keys(localTagDB).length} songs have cached tags.`)
                $tagDB = localTagDB
            } else {
                console.log("not all songs have cached tags. getting tags from songs...")
                console.time(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
                api.cacheTags($allSongs).then(val => {
                    localTagDB = val
                    api.saveConfig(`./db/${btoa($maindir)}.json`, localTagDB, true)
                    console.timeEnd(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
                    $tagDB = localTagDB
                }).catch((e) => {console.error(e)})
            }

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
            })*
            //backend
            api.tagSongs($allSongs).then(val => {
                $allSongs = val
                //console.timeEnd("got tags in")
                searchDisabled = false
            })
            */
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
        <ExtraDetailsView hide={true} data={$extraDetailsData}/>
    </div>
</main>

<div id="moremenu" class="hidden">
    <ul id="mm-ul">
        <li class="mm-li">Bruh</li>
    </ul>
</div>

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

