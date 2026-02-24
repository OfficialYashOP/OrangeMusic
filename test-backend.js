async function test() {
    try {
        console.log("Testing Explain Lyrics...");
        const res = await fetch('https://orangemusic.vercel.app/api/explain-lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                songName: "Apna Bana Le",
                artist: "Arijit Singh"
            })
        });

        console.log("Status:", res.status, res.statusText);
        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
