<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'

    export let data: ExtraDetailsData = {
        path: 'Unknown Path', //D:\music\main\cozyboy - what did you think i meant when i said i love you.mp3
        genre: 'Unknown Genre', //R&B
        format: 'Unknown Format', //MPEG 1 layer 3
        duration: '0:00', //3:01
        bitrate: 'Unknown bitrate', //320 kb/s
        size: 'Unknown size', //0.00 MB
        samplerate: 'Unknown', //44100 Hz
        year: 'Unknown Year', //2018
        forceReveal: false
    }
    export let hide = false;
    const desc = {
        path: 'Path to song',
        genre: 'Genre: ',
        format: 'Format / Codec: ',
        duration: 'Duration: ',
        bitrate: 'Bitrate: ',
        size: 'Size: ',
        samplerate: 'Sample rate: ',
        year: 'Year: '
    }

    /**
     * maps the extra details data to an object that can be easily iterated and rendered
    */
    function _mapDataToDisplay() {
        let disp = Object.keys(data).map(key => {
            // @ts-ignore
            return { key, val: data[key], desc: desc[key]}
        }).filter(item => {
            if (item.key == "forceReveal") { return false } else {return true}
        })
        return disp
    }

    let display = _mapDataToDisplay()
    // for each good generative solution i have to use one bad reactive statement. karma.
    // not quite sure how exactly this display variable works so i don't want to rewrite the displaying
    $: {
        display = _mapDataToDisplay();
        if (data.forceReveal){
            data.forceReveal = false
            hide = false
        }
    }
    
    function hideme() {
        hide = true;
    }
</script>

<article class:hidden-f={hide}>
    {#each display as prop, i}
        <span title={prop.desc} class="key {prop.key}" style="grid-area: k{prop.key};">{prop.desc}</span>
        <span title={prop.val} class="value {prop.key}" style="grid-area: {prop.key};">{prop.val}</span>
    {/each}
    <hr class="spacer">
    <span class="closebtn">
        <Button variant="outlined" class="mdbutton mdborder" on:click={hideme}>
            <Label>Collapse</Label>
            <Icon class="material-icons icon-135 mdicontext">expand_more</Icon>
        </Button>
    </span>
</article>

<style>
    article {
        display: grid;
        grid-template: repeat(3, 1fr) 1rem repeat(2, 1fr) / repeat(5, 1fr);
        grid-template-areas:
        "kpath kpath path path path"
        "kgenre kgenre genre genre closebtn"
        "kformat kformat format format closebtn"
        "spacer spacer spacer spacer spacer"
        "kduration duration ksize size kyear"
        "kbitrate bitrate ksamplerate samplerate year";

        margin: 0.5rem;
        position: relative;
        column-gap: 0.2rem;
        width: 100%;
        box-sizing: border-box;
    }
    .key {
        font-weight: bold;
    }
    .key, .value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .spacer {
        grid-area: spacer;
        position: relative;
        height: 1rem !important;
        margin: 0;
        margin-top: 8px;

        border-color: var(--text-tertiary);

        display: flex;
        align-items: flex-end;
        justify-content: center;
    }
    .closebtn {
        grid-area: closebtn;
        display: flex;
        justify-content: flex-end;
    }
</style>