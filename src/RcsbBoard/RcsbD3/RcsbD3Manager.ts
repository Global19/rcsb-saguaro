import {RcsbD3Constants} from "./RcsbD3Constants";
import {Selection, select, event, BaseType, EnterElement} from "d3-selection";
import {ZoomBehavior, ZoomedElementBaseType} from "d3-zoom";
import {ScaleLinear} from "d3-scale";
import * as classes from "../scss/RcsbBoard.module.scss";
import {
    RcsbFvTrackDataElementGapInterface,
    RcsbFvTrackDataElementInterface
} from "../../RcsbDataManager/RcsbDataManager";

export interface SVGConfInterface  {
    elementId: string,
    domClass: string;
    svgClass: string;
    width: number;
    pointerEvents: string;
    mouseoutCallBack: Array<()=>void>;
    mouseoverCallBack: Array<()=>void>;
    mousemoveCallBack: Array<()=>void>;
}

export interface MainGConfInterface  {
    masterClass: string;
    innerClass: string;
    dblClick: () => void;
    mouseDown: () => void;
    mouseUp: () => void;
}

export interface PaneConfInterface {
    paneClass: string;
    bgColor: string;
    elementId: string;
}

export interface TrackConfInterface {
    trackClass: string;
    height: number;
    compositeHeight: number;
    bgColor: string;
}

export interface ZoomConfigInterface {
    zoomEventHandler:ZoomBehavior<ZoomedElementBaseType, any>;
    zoomCallBack: () => void;
}

export interface HighlightRegionInterface {
    trackG: Selection<SVGGElement,any,null,undefined>;
    height: number;
    begin: number;
    end: number;
    isEmpty:boolean;
    xScale: ScaleLinear<number,number>;
    rectClass: string;
    gaps: Array<RcsbFvTrackDataElementGapInterface>;
}

export interface MoveSelectedRegionInterface {
    trackG: Selection<SVGGElement,any,null,undefined>;
    xScale: ScaleLinear<number,number>;
    rectClass: string;
}

interface SelectedElementInterface {
    begin: number;
    end: number;
}

export class RcsbD3Manager {

    _dom: Selection<HTMLElement | null, any, null, undefined>;
    _svg: Selection<SVGSVGElement, any, null, undefined>;
    _zoomG: Selection<SVGGElement, any, null, undefined>;
    _svgG: Selection<SVGGElement, any, null, undefined>;
    _pane: Selection<SVGRectElement, any, null, undefined>;
    _trackHeightPosition: number = 0;

    _width: number;

    svgG(): Selection<SVGGElement, any, null, undefined> {
        return this._svgG;
    }

    zoomG(): Selection<SVGGElement, any, null, undefined> {
        return this._zoomG;
    }

    buildSvgNode(config: SVGConfInterface): void {
        this._dom = select(document.getElementById(config.elementId));
        this._dom.classed(config.domClass, true)
            .style(RcsbD3Constants.WIDTH, config.width + "px");

        this._svg = this._dom.append<SVGSVGElement>(RcsbD3Constants.SVG)
            .attr(RcsbD3Constants.CLASS, config.svgClass)
            .attr(RcsbD3Constants.WIDTH, config.width)
            .attr(RcsbD3Constants.POINTER_EVENTS, config.pointerEvents)
            .on(RcsbD3Constants.CONTEXT_MENU, ()=>{
                event.preventDefault();
            })
            .on(RcsbD3Constants.MOUSE_ENTER,()=>{
                config.mouseoverCallBack.forEach(f=>{
                    f();
                });
            })
            .on(RcsbD3Constants.MOUSE_LEAVE,()=>{
                config.mouseoutCallBack.forEach(f=>{
                    f();
                })
            }).on(RcsbD3Constants.MOUSE_MOVE,()=>{
                config.mousemoveCallBack.forEach(f=>{
                    f();
                })
            });

        this._width = config.width;
    }

    addMainG(config: MainGConfInterface): void {
        this._zoomG = this._svg.append<SVGGElement>(RcsbD3Constants.G);
        this._svgG = this._zoomG.attr(RcsbD3Constants.CLASS, config.masterClass)
            .append<SVGGElement>(RcsbD3Constants.G)
            .attr(RcsbD3Constants.CLASS, config.innerClass)
            .on(RcsbD3Constants.DBL_CLICK, config.dblClick)
            .on(RcsbD3Constants.MOUSE_DOWN, config.mouseDown)
            .on(RcsbD3Constants.MOUSE_UP, config.mouseUp);
    }

    addPane(config: PaneConfInterface): void {
        this._pane = this._svgG
            .append<SVGRectElement>(RcsbD3Constants.RECT)
            .attr(RcsbD3Constants.CLASS, config.paneClass)
            .attr(RcsbD3Constants.ID, config.elementId)
            .attr(RcsbD3Constants.WIDTH, this._width)
            .style(RcsbD3Constants.FILL, config.bgColor)
    }

    getPane(): SVGRectElement{
        const out: SVGRectElement | null =  this._pane.node();
        if( out == null)
            throw "SVG main panel is null";
        return out;
    }

    resetAllTracks(): void{
        this._trackHeightPosition = 0;
        this._svgG.selectAll("."+classes.rcsbTrack).remove();
    }

    addTrack(config: TrackConfInterface): Selection<SVGGElement, any, null, undefined> {
        this._pane.style(RcsbD3Constants.FILL, config.bgColor);

        const trackG: Selection<SVGGElement, any, null, undefined> = this._svgG
            .append<SVGGElement>(RcsbD3Constants.G)
            .attr(RcsbD3Constants.CLASS, config.trackClass)
            .attr(RcsbD3Constants.TRANSFORM, "translate(0," + (this._trackHeightPosition+config.compositeHeight) + ")");

        this._trackHeightPosition += config.height;

        return trackG;
    }

    setBoardHeight(height: number): void {
        this._dom.style(RcsbD3Constants.HEIGHT, height + "px");
        this._svg.attr(RcsbD3Constants.HEIGHT, height);
        this._pane.attr(RcsbD3Constants.HEIGHT, height);
    }

    addZoom(config: ZoomConfigInterface): void {
        this._zoomG.call(
            config.zoomEventHandler.on(RcsbD3Constants.ZOOM, config.zoomCallBack)
        ).on(RcsbD3Constants.DBLCLIK_ZOOM, null);
    }

    highlightRegion(config: HighlightRegionInterface): void {

        const elementsToSelect: Array<SelectedElementInterface> = new Array<SelectedElementInterface>();
        const hlRegion:(b:number,e:number)=>SelectedElementInterface = (begin:number,end:number) => {
            return {begin:begin, end:end};
        };
        const minWidth = (begin:number, end:number)=>{
            let w: number = config.xScale(end + 0.5) - config.xScale(begin - 0.5);
            if(w<2)w=2;
            return w;
        };

        if(config.isEmpty) {
            elementsToSelect.push(hlRegion(config.begin, config.begin));
            elementsToSelect.push(hlRegion(config.end, config.end));
        }else if(config.gaps!=null && config.gaps.length>0){
            let begin:number = config.begin;
            config.gaps.forEach(gap=>{
                let end: number = gap.begin;
                elementsToSelect.push(hlRegion(begin,end));
                begin = gap.end;
            });
            elementsToSelect.push(hlRegion(begin,config.end));
        }else{
            elementsToSelect.push(hlRegion(config.begin, config.end));
        }

        const visSel:Selection<SVGRectElement,SelectedElementInterface,SVGElement,any> = config.trackG.selectAll<SVGRectElement,any>("."+classes.rcsbSelectRect);
        const visElems:Selection<SVGRectElement,SelectedElementInterface,SVGElement,any> = visSel.data(elementsToSelect);
        const newElem:Selection<EnterElement,SelectedElementInterface,SVGElement,any> = visElems.enter();

        newElem.append<SVGRectElement>(RcsbD3Constants.RECT)
            .attr(RcsbD3Constants.X, (d:SelectedElementInterface)=>{
                return config.xScale(d.begin - 0.5)})
            .attr(RcsbD3Constants.Y, 0)
            .attr(RcsbD3Constants.WIDTH, (d:SelectedElementInterface)=>{
                return minWidth(d.begin,d.end)})
            .attr(RcsbD3Constants.HEIGHT, config.height)
            .attr(RcsbD3Constants.FILL, "#faf3c0")
            .attr(RcsbD3Constants.FILL_OPACITY, 0.75)
            .attr(RcsbD3Constants.CLASS, config.rectClass)
            .lower();
        visElems.exit().remove();
    }

    moveSelection(config: MoveSelectedRegionInterface): void{
        const minWidth = (begin:number, end:number)=>{
            let w: number = config.xScale(end + 0.5) - config.xScale(begin - 0.5);
            if(w<2)w=2;
            return w;
        };
        const selectRect:Selection<SVGRectElement,SelectedElementInterface,SVGElement,any> = config.trackG.selectAll<SVGRectElement,any>("."+classes.rcsbSelectRect);
        selectRect.attr(RcsbD3Constants.X, (d:SelectedElementInterface)=>{
            return config.xScale(d.begin - 0.5)})
            .attr(RcsbD3Constants.WIDTH, (d:SelectedElementInterface)=>{
                return minWidth(d.begin,d.end)});

    }
}
