import {event} from "d3-selection";
import {ScaleLinear, scaleLinear} from "d3-scale";
import {zoom, ZoomBehavior, ZoomedElementBaseType, ZoomTransform, zoomIdentity} from "d3-zoom";

import {
    MainGConfInterface,
    PainConfInterface,
    RcsbD3Manager,
    SVGConfInterface, ZoomConfigInterface
} from "./RcsbD3/RcsbD3Manager";

import * as classes from "./scss/RcsbBoard.module.scss";
import {MOUSE} from "./RcsbD3/RcsbD3Constants";
import {
    EVENT_TYPE,
    RcsbFvContextManager,
    RcsbFvContextManagerInterface
} from "../RcsbFv/RcsbFvContextManager/RcsbFvContextManager";
import {RcsbDisplayInterface} from "./RcsbDisplay/RcsbDisplayInterface";

export interface SelectionInterface {
    begin: number;
    end: number;
    domId: string;
}

export interface LocationViewInterface {
    from: number;
    to: number;
}

interface RegionLimitsInterface {
    max: number;
    min: number;
    maxZoom: number;
    minZoom: number;
}

export interface ScaleTransform {
    transform:ZoomTransform;
    domId: string;
}

export class RcsbBoard {
    d3Manager: RcsbD3Manager = new RcsbD3Manager();
    domId: string = null;
    _width: number = 920;
    _bgColor: string = "#FFFFFF";
    _innerPadding: number = 10;
    tracks: Array<RcsbDisplayInterface> = new Array<RcsbDisplayInterface>();
    currentSelection: SelectionInterface;
    xScale: ScaleLinear<number,number> = scaleLinear();
    limits: RegionLimitsInterface = {
        max: 10000,
        min: -1.5,
        maxZoom: 1000000,
        minZoom: 20
    };
    currentLocationView: LocationViewInterface = {
        from:1,
        to:500
    };

    zoomEventHandler:ZoomBehavior<ZoomedElementBaseType, any> = zoom();

    constructor(elementId: string){
        this.domId = elementId;

        const svgConfig: SVGConfInterface = {
            elementId: elementId,
            svgClass:classes.rcsbSvg,
            domClass:classes.rcsbDom,
            width:this._width,
            pointerEvents:"all",
            contextMenu:()=>{
                event.preventDefault();
            }
        };
        this.d3Manager.buildSvgNode(svgConfig);

        const innerConfig: MainGConfInterface ={
            masterClass: classes.rcsbMaterG,
            innerClass: classes.rcsbInnerG,
            mouseUp:()=>{
                if(event.which === MOUSE.LEFT) {
                    event.stopImmediatePropagation();
                }
                //brush_selection.mouseup.call(this,track_vis,svg_g,xScale);
            },
            mouseDown:()=>{
                if(event.which === MOUSE.LEFT) {
                    event.stopImmediatePropagation();
                }
    	        //brush_selection.mousedown.call(this,track_vis,svg_g,xScale);
            },
            dblClick:()=>{
                this.highlightRegion(null,null,false);
            }
        };
        this.d3Manager.addMainG(innerConfig);

        const paneConfig: PainConfInterface = {
            bgColor: this._bgColor,
            elementId: this.domId+"_pane",
            paneClass: classes.rcsbPane
        };
        this.d3Manager.addPane(paneConfig);

    }

    public setRange(from: number, to: number): void{
        this.currentLocationView.from = from;
        this.currentLocationView.to = to;
    }

    public setSelection(selection: SelectionInterface): void{
        if(selection.domId === this.domId){
            this.highlightRegion(selection.begin,selection.end,true);
        }
    }

    highlightRegion(begin: number, end: number, propFlag: boolean): void{
        if((typeof(begin) === "number" && typeof(end)==="number") || (begin === null && end===null)){
            this.currentSelection = {begin:begin, end:end, domId: this.domId} as SelectionInterface;
            if(propFlag!==true) {
                RcsbBoard.triggerSelectionEvent({
                    eventType:EVENT_TYPE.SELECTION,
                    eventData:this.currentSelection
                } as RcsbFvContextManagerInterface);
            }
        }else if(typeof(this.currentSelection.begin) === "number" && typeof(this.currentSelection.end)==="number"){
            begin = this.currentSelection.begin;
            end = this.currentSelection.end;
        }

        this.tracks.forEach((track)=>{
            track.highlightRegion(begin, end);
        });
    }

    startBoard(): void{
        if ((this.limits.max - this.limits.min) < this.limits.maxZoom) {
            this.limits.maxZoom = this.limits.max - this.limits.min;
        }

    	this.xScale = scaleLinear()
    	    .domain([this.currentLocationView.from, this.currentLocationView.to])
    	    .range([this._innerPadding, this._width-this._innerPadding]);

        this.zoomEventHandler.scaleExtent([0.5,20])

    	this.d3Manager.addZoom({
            zoomEventHandler: this.zoomEventHandler,
            zoomCallBack: this.moveBoard.bind(this)
        } as ZoomConfigInterface);

    	this.tracks.forEach(track=>{
            track.init(this._width, this.xScale);
        });

    	this.setBoardHeight();

        if ((this.currentLocationView.to - this.currentLocationView.from) < this.limits.minZoom) {
            if ((this.currentLocationView.from + this.limits.minZoom) > this.limits.max) {
                this.currentLocationView.to = this.limits.max;
            } else {
                this.currentLocationView.to = this.currentLocationView.from + this.limits.minZoom;
            }
        }

        this.tracks.forEach((track)=> {
            track.update({from: this.currentLocationView.from, to: this.currentLocationView.to} as LocationViewInterface);
        })

    }

    updateBoard(): void{
        this.tracks.forEach((track)=> {
            track.update({from: this.currentLocationView.from, to: this.currentLocationView.to} as LocationViewInterface);
        })
    }

    public addTrack(track: RcsbDisplayInterface|Array<RcsbDisplayInterface>): void{
        if (track instanceof Array) {
            track.forEach((t) => {
                t.setD3Manager(this.d3Manager);
                this.tracks.push(t);
            });
        }else{
            track.setD3Manager(this.d3Manager);
            this.tracks.push(track);
        }
    }

    setBoardHeight(): void{
        let h = 0;
        this.tracks.forEach(track=>{
            h += track.height();
        });
        this.d3Manager.setBoardHeight(h);
    }

    setLocation(from: number, to: number): void {
        this.currentLocationView = {
            from: from,
            to: to
        };
    }

    updateAllTracks(): void {
        const location = this.xScale.domain();
    	this.setLocation(~~location[0],~~location[1]);
        this.tracks.forEach(track=> {
            track.update(this.currentLocationView);
        });
    }

    moveBoard(newTransform: ZoomTransform, propFlag: boolean): void {

        let transform: ZoomTransform = null;
        const isNotIdentity = (transform: ZoomTransform): boolean => {
            return !(transform.x === 0 && transform.y === 0 && transform.k === 1);
        };

        if(typeof newTransform === "object"){
            transform = newTransform;
        }else if(isNotIdentity(event.transform)) {
            transform = event.transform;
        }else{
            return;
        }
        this.xScale.domain(transform.rescaleX(this.xScale).domain());
        this.d3Manager.zoomG().call(this.zoomEventHandler.transform, zoomIdentity);

        /*const deferCancel = (callBack: () => void, waitTime: number) => {
            let tick = null;
            return () =>{
                const args = Array.prototype.slice.call(arguments);
                const self = this;
                clearTimeout();
                tick = setTimeout (function () {
                    callBack.apply(self, args);
                }, waitTime);
            };
        };

        deferCancel(this.updateAllTracks.bind(this), 100)();*/

    	this.tracks.forEach(track=> {
            track.move();
        });

    	//TODO this shouldnt be here
        //track_vis.select_region.call(track_vis);

        if(propFlag !== true){
            const data:ScaleTransform = {
                transform:transform,
                domId:this.domId
            };
            RcsbBoard.triggerScaleEvent({
                    eventType:EVENT_TYPE.SCALE,
                    eventData:data
            } as RcsbFvContextManagerInterface);
        }
    };

    public setScale(transformEvent: ScaleTransform){
        if(transformEvent.domId !== this.domId){
    	    this.moveBoard(transformEvent.transform,true);
        }
    }

    private static triggerScaleEvent(geoTrans: RcsbFvContextManagerInterface){
        RcsbFvContextManager.next(geoTrans);
    }

    private static triggerSelectionEvent(selection: RcsbFvContextManagerInterface){
        RcsbFvContextManager.next(selection);
    }
}