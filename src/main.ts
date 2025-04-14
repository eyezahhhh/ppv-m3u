import { promisify } from "util";
import { Ppv, PpvStreamStub } from "./ppv";
import * as FS from "fs";

const MIRRORS: string[] = [
    "https://ppv.land",
    "https://freeppv.fun",
    "https://ppv.wtf",
    "https://ppvs.su"
];

const m3uList: Record<string, null | ((stream: PpvStreamStub) => boolean)> = {
    "full": null,
    "24-7": (stream) => {
        const monthAgo = Date.now() / 1000 - 86400 * 30;
        return monthAgo > stream.starts_at;
    },
    "event": (stream) => {
        const monthAgo = Date.now() / 1000 - 86400 * 30;
        return monthAgo < stream.starts_at;
    }
};

FS.mkdirSync("m3u", {
    recursive: true
});
FS.mkdirSync("xml", {
    recursive: true
});

(async () => {
    for (let mirror of MIRRORS) {
        const ppv = new Ppv(mirror);
        if (await ppv.isWorking()) {
            console.log(`Mirror ${ppv.baseUrl} is working.`);
        } else {
            console.log(`Mirror ${ppv.baseUrl} is not working; trying another mirror...`);
            continue;
        }

        for (let [name, criteria] of Object.entries(m3uList)) {
            try {
                console.log(`Generating M3U "${name}"...`);
                const data = await ppv.generateM3U(criteria || undefined);
                console.log(`Generated M3U successfully; writing to disk...`);
                await promisify(FS.writeFile)(`m3u/${name}.m3u`, data.m3u);
                await promisify(FS.writeFile)(`xml/${name}.xml`, data.xml);
                console.log(`Saved M3U successfully.`);
            } catch (e) {
                console.error(`Failed to generate M3U "${name}".`, e);
            }
        }

        break;
    }
})();
