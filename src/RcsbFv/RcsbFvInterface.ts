import {RcsbFvData, RcsbFvDataArray} from "./RcsbFvTrack/RcsbFvDataManager";

export interface RcsbFvBoardConfigInterface {
    length: number;
    rowTitleWidth?: number;
    trackWidth?: number;
    includeAxis?: boolean;
}

export interface RcsbFvDisplayConfigInterface{
    displayColor: string;
}

export interface RcsbFvRowConfigInterface {
    displayType: string | Array<string>;
    length? : number;
    elementId?:string;
    trackHeight?: number;
    trackColor?: string;
    displayColor?: string;
    rowTitle?: string;
    trackData?: string | RcsbFvData | RcsbFvDataArray;
    displayDomain?: Array<number>;
    displayConfig?: Array<RcsbFvDisplayConfigInterface>;
    trackWidth?: number;
    rowTitleWidth?: number;
    interpolationType?: string;
    isAxis?: boolean;
}