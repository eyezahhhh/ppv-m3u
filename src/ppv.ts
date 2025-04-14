import { AxiosError, RawAxiosRequestHeaders } from "axios";
import { escapeXml, timestampToString, toXmlDate } from "./utils";
import { request } from "./request";

export interface PpvStreamStub {
    id: number;
    name: string;
    tag: string;
    poster: string;
    uri_name: string;
    starts_at: number;
    ends_at: number;
    always_live: 0 | 1;
    category_name: string;
    viewers: string;
}

export interface PpvStreamCategory {
    category: string;
    id: number;
    always_live: 0 | 1;
    streams: PpvStreamStub[];
}

export interface PpvStreamSource {
    name: string;
    default?: true;
    type: string;
    data: string;
}

export interface PpvStream {
    id: number;
    name: string;
    poster: string;
    tag: string;
    description: string;
    m3u8: string;
    source: string;
    sources: PpvStreamSource[];
    source_type: string;
    start_timestamp: number;
    end_timestamp: number;
    vip_stream: number;
    auth: boolean;
    edit: string;
    server_id: number;
    clipping: boolean;
    token: string;
    vip_mpegts: string;
}

export class Ppv {
    constructor(public readonly baseUrl: string) {}

    public getHeaders(): RawAxiosRequestHeaders {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": `${this.baseUrl}/`,
            "Origin": this.baseUrl
        };
    }

    public async isWorking() {
        try {
            const response = await request("head", `${this.baseUrl}/api/streams`, {
                headers: this.getHeaders()
            });
            if (response.status == 200) {
                return true;
            }
        } catch {}
        return false;
    }

    public async getStreams() {
        const response = await request<{ streams: PpvStreamCategory[] }>("get", `${this.baseUrl}/api/streams`, {
            headers: this.getHeaders()
        });

        if (response.status != 200) {
            throw new Error(`Failed to fetch streams! (status code ${response.status})`);
        }
        
        for (let category of response.data.streams) {
            category.streams.sort((a, b) => b.starts_at - a.starts_at);
            // console.log(`Found ${category.streams.length} streams in category ${category.category}`);
        }

        return response.data.streams;
    }

    public async getVideoUrl(stream: PpvStreamStub) {
        // console.log(`Fetching video URL for ${stream.name} (${stream.category_name})`);

        const response = await request<{ success: true, data: PpvStream } | { success: false }>("get", `${this.baseUrl}/api/streams/${stream.id}`, {
            headers: this.getHeaders()
        });

        if (response.status != 200) {
            throw new Error(`Failed to fetch stream video url! (status code ${response.status})`);
        }

        if (!response.data.success) {
            throw new Error(`Failed to fetch stream video url! (success false)`);
        }

        return response.data.data.m3u8;
    }

    public async getUrlStatus(url: string) {
        try {
            const response = await request("head", url, {
                headers: this.getHeaders()
            });
            return response.status;
        } catch (e) {
            if (e instanceof AxiosError) {
                if (e.status) {
                    return e.status;
                }
            }
            throw e;
        }
    }

    public async isStreamValid(stream: PpvStreamStub, m3u8: string) {
        const startedAgo = stream.starts_at - Date.now() / 1000;

        try {
            const status = await this.getUrlStatus(m3u8);
            if (status == 200) {
                return true;
            }
        } catch {}
        if (startedAgo < 86400 * 2 && startedAgo > -86400 * 2) {
            return true;
        }
        return false;
    }

    public async generateM3U(criteria?: (stream: PpvStreamStub) => boolean) {
        const start = Date.now();
        const categories = await this.getStreams();
        const monthAgo = Date.now() / 1000 - 86400 * 30;

        let m3uContent = "#EXTM3U\n";
        let total = 0;

        let tvGuide = `<tv>`;

        for (let category of categories) {
            for (let stream of category.streams) {
                if (criteria && !criteria(stream)) {
                    continue;
                }
                try {
                    const m3u8 = await this.getVideoUrl(stream);
                    const isValid = await this.isStreamValid(stream, m3u8);

                    if (isValid) {

                        const wasMonthAgo = monthAgo > stream.starts_at;

                        let title = stream.name;
                        if (!wasMonthAgo) {
                            title += ` (${timestampToString(stream.starts_at * 1000)})`;
                        }
                        
                        m3uContent += `#EXTINF:-1 tvg-id="ppv-${stream.id}" tvg-name="${title}" tvg-epgid="${stream.id}" tvg-logo="${stream.poster}",${title}\n`;
                        m3uContent += `${m3u8}\n`;
                        total++;

                        const xml = `
                            <channel id="${escapeXml(`ppv-${stream.id}`)}">
                                <display-name>${escapeXml(stream.name)}</display-name>
                            </channel>
                            <programme
                                start="${escapeXml(`${toXmlDate(new Date(stream.starts_at * 1000)) } +0000`)}"
                                stop="${escapeXml(`${toXmlDate(new Date(stream.ends_at * 1000)) } +0000`)}"
                                channel="${escapeXml(`ppv-${stream.id}`)}"
                            >
                                <title lang="en">${escapeXml(stream.name)}</title>
                                <sub-title>${escapeXml(stream.category_name)}</sub-title>
                                <video>
                                    <present>yes</present>
                                    <colour>yes</colour>
                                </video>
                                <audio>
                                    <present>yes</present>
                                    <stereo>stereo</stereo>
                                </audio>
                                <category>${escapeXml(stream.category_name)}</category>
                                <icon src="${escapeXml(stream.poster)}" />
                            </programme>
                        `.split("\n").map((line) => line.trim()).join("\n");
                        tvGuide += xml;
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }

        console.log(`Finished generating M3U in ${Math.round((Date.now() - start) / 100) / 10} seconds.`);

        if (!total) {
            throw new Error("No valid streams detected.");
        }

        tvGuide += "</tv>";

        return {
            m3u: m3uContent,
            xml: tvGuide
        };
    }
}