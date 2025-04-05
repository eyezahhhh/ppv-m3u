import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";

type SupportedMethods = "get" | "head"

const requestCache: Record<SupportedMethods, Map<string, AxiosResponse>> = {
    get: new Map<string, AxiosResponse>,
    head: new Map<string, AxiosResponse>
}

export async function request<T>(type: SupportedMethods, url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T, any>> {
    const map = requestCache[type];

    const existing = map.get(url);
    if (existing) {
        return existing;
    }

    const response = await Axios[type]<T>(url, config);
    map.set(url, response);
    return response;
}