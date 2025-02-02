
import { GeoStyle } from "./geoStyle";
import { GeoBrush } from "../style/geoBrush";
import { TextLabelingStrategy } from "./textLabelingStrategy";
import { DetectTextLabelingStrategy } from "./detectTextLabelingStrategy";
import { GeoPointStyle } from "./geoPointStyle";

export class GeoTextStyle extends GeoStyle {
    static measureCanvas = undefined;
    static measureContext = undefined;

    compounds = ['apply-all', 'apply-first'];
    defaultCompund = 'apply-first';

    aligns = ["left", "right", "center"];
    defaultAlign = "center";

    baselines = ["bottom", "top", "middle"];
    defaultBaseline = "middle";

    letterCases = ["default", "uppercase", "lowercase"];
    defaultLetterCase = "default";

    placements = ["upperleft", "upper", "upperright", "right", "center", "left", "lowerleft", "lowerleft", "lower", "lowerright", "autoPlacement"]
    defaultPlacement = "center";

    align: string;
    baseline: string;
    dateFormat: string;
    offsetX: number;
    offsetY: number;
    font: string;
    fillColor: string;
    forceHorizontalForLine: boolean;
    haloColor: string;
    haloRadius: number;
    maskColor: string;
    maskMargin: string;
    maskOutlineColor: string;
    maskOutlineWidth: number;
    maskType: string;
    maxCharAngleDelta: number;
    intervalDistance: number;
    contentFormat: string;
    numericFormat: string;
    opacity: number;
    rotationAngle: number;
    placement: string;
    spacing: number;
    wrapBefore: string;
    wrapWidth: number;
    letterCase: string;
    letterSpacing: number;
    basePointStyle: any;
    style: ol.style.Style;
    state_: any;
    charWidths: any;

    constructor(styleJson?: any) {
        super(styleJson);
        this.labelInfos = new (<any>ol).structs.LRUCache(512);
        this.charWidths = {};

        if (styleJson) {
            this.compound = styleJson["filter-apply-mode"];

            this.font = styleJson["text-font"];
            this.fillColor = styleJson["text-fill-color"];
            this.haloColor = styleJson["text-halo-color"];
            this.haloRadius = styleJson["text-halo-radius"];

            this.contentFormat = styleJson["text-content"];
            this.dateFormat = styleJson["text-date-format"];
            this.numericFormat = styleJson["text-numeric-format"];
            this.letterCase = styleJson["text-letter-case"];

            this.letterSpacing = styleJson["text-letter-spacing"] || 0;
            this.wrapWidth = styleJson["text-wrap-width"] || 0;
            this.wrapBefore = styleJson["text-wrap-before"] || false; // internal property
            this.align = styleJson["text-align"] || "center";

            this.maskType = styleJson["text-mask-type"];
            this.maskMargin = styleJson["text-mask-margin"];
            this.maskColor = styleJson["text-mask-color"];
            this.maskOutlineColor = styleJson["text-mask-outline-color"];
            this.maskOutlineWidth = styleJson["text-mask-outline-width"] || 0;

            this.offsetX = styleJson["text-offset-x"];
            this.offsetY = styleJson["text-offset-y"];
            this.baseline = styleJson["text-baseline"] || this.defaultBaseline;
            this.placement = styleJson["text-placement"] || this.defaultPlacement;

            this.forceHorizontalForLine = styleJson["text-force-horizontal-for-line"];
            this.intervalDistance = styleJson["text-interval-distance"] || 0;
            this.spacing = styleJson["text-spacing"] || 0;
            this.rotationAngle = styleJson["text-rotation-angle"];
            this.maxCharAngleDelta = styleJson["text-max-char-angle-delta"];
            this.opacity = styleJson["text-opacity"];


            this.lineSpacing = styleJson["text-line-spacing"] || 0;

            this.basePointStyleJson = styleJson["text-base-point-style"];

            this.allowOverlapping = styleJson["text-allow-overlapping"] || false;
        }
        if (!this.compounds.includes(this.compound)) {
            this.compound = this.defaultCompund;
        }
    }

    initializeCore() {
        let fill = new ol.style.Fill();
        let stroke = new ol.style.Stroke();
        let textStyle = new ol.style.Text({
            fill: fill,
            stroke: stroke
        });
        ol.getUid(textStyle);

        if (this.basePointStyleJson) {
            this.basePointStyle = new GeoPointStyle(this.basePointStyleJson);
            this.basePointStyle["zIndex"] = this.zIndex;
            this.isBasePointStyleJson = true;
        }

        this.style = new ol.style.Style({
            text: textStyle,
        });

        if (this.font) {
            textStyle.setFont(this.font);
        }

        if (this.fillColor) {
            this.olColor = GeoStyle.blendColorAndOpacity(this.fillColor, this.opacity);
            fill.setColor(this.olColor);
        }

        if (!this.haloRadius || this.haloColor === undefined) {
            textStyle.setStroke(undefined);
        }
        else {
            this.olHaloColor = GeoStyle.blendColorAndOpacity(this.haloColor, this.opacity);
            stroke.setColor(this.olHaloColor);
            stroke.setWidth(this.haloRadius);
        }

        if (this.letterCase) {
            this.letterCase = this.letterCase.toLowerCase()
        }
        if (!this.letterCases.includes(this.letterCase)) {
            this.letterCase = this.defaultLetterCase;
        }

        if (this.align) {
            this.align = this.align.toLowerCase();
        }
        if (!this.aligns.includes(this.align)) {
            this.align = this.defaultAlign;
        }
        textStyle.setTextAlign(this.align);

        this.maskMarginList = this.getMargin(this.maskMargin);
        this.maskStrokeWidth = this.maskOutlineWidth || 0;

        if (this.offsetX) {
            textStyle.setOffsetX(this.offsetX);
        }
        if (this.offsetY) {
            textStyle.setOffsetY(this.offsetY);
        }

        if (this.baseline) {
            this.baseline = this.baseline.toLowerCase()
        }
        if (!this.baselines.includes(this.baseline)) {
            this.baseline = this.defaultBaseline;
        }
        textStyle.setTextBaseline(this.baseline);

        if (this.placement) {
            this.placement = this.placement.toLowerCase();
        }
        if (!this.placement.includes(this.placement)) {
            this.placement = this.defaultPlacement;
        }
        textStyle["placements"] = this.placement;
        textStyle["intervalDistance"] = this.intervalDistance;
        textStyle["spacing"] = this.spacing / 2;

        if (this.rotationAngle) {
            textStyle.setRotation(this.rotationAngle);
        }
        if (this.maxCharAngleDelta >= 0) {
            (<any>textStyle).setMaxAngle(this.maxCharAngleDelta);
        }

        if (ol.has.SAFARI) {
            // TODO the letterSpacing doesn't work on Safari
            this.letterSpacing = 0;
        }

        if (this.contentFormat) {
            var replaceMatch = /\{(.+?)\}/g;
            var replaceOptions = this.contentFormat.match(replaceMatch);
            this.contentFormatItems = [];
            if (replaceOptions) {
                for (var index = 0; index < replaceOptions.length; index++) {
                    var element = replaceOptions[index];
                    element = element.substr(1, element.length - 2);
                    this.contentFormatItems.push(element);
                }
            }
        }
        this.style.setZIndex(this.zIndex);
    }

    getConvertedStyleCore(feature: any, resolution: number, options: any): ol.style.Style[] {
        let textStyles = [];
        let featureText = "";

        if (this.contentFormat) {
            featureText = this.getTextWithContent(this.contentFormat, feature, this.dateFormat, this.numericFormat);
        }
        if (this.basePointStyle) {
            let geometryType = feature.getGeometry().getType();
            if (!(geometryType === (<any>ol.geom).GeometryType.LINE_STRING || geometryType === (<any>ol.geom).GeometryType.MULTI_LINE_STRING) || this.forceHorizontalForLine) {
                let basePointOLStyle = this.basePointStyle.getStyles(feature, resolution, options);
                Array.prototype.push.apply(textStyles, basePointOLStyle);
            }
        }

        if ((featureText === undefined || featureText === "")) {
            return textStyles;
        }

        featureText = this.getTextWithLetterCase(this.letterCase, featureText);

        this.style.getText().setText(featureText);

        this.style.getText()["placements"] = this.placement;
        if (this.setLabelPosition(featureText, feature.getGeometry(), resolution, this.style.getText(), options.strategyTree, options.frameState)) {
            let featureZindex = feature["tempTreeZindex"];
            if (featureZindex === undefined) {
                featureZindex = 0;
            }
            this.style['zCoordinate'] = featureZindex;
            textStyles.push(this.style);
        }

        return textStyles;
    }

    setLabelPosition(text: string, geometry: any, resolution: any, textState: ol.style.Text, strategyTree: any, frameState: olx.FrameState): boolean {
        let flatCoordinates;

        let geometryType = geometry.getType();
        if ((geometryType === (<any>ol.geom).GeometryType.LINE_STRING || geometryType === (<any>ol.geom).GeometryType.MULTI_LINE_STRING) && !this.forceHorizontalForLine) {
            let geometryType = geometry.getType();
            flatCoordinates = geometry.getFlatCoordinates();
            if (flatCoordinates === undefined) { return false; }
        } else {
            let labelInfo = this.getLabelInfo(text, textState);

            let canvasWidth = labelInfo.labelWidth;
            let canvasHeight = labelInfo.labelHeight;
            let tmpLabelWidth = canvasWidth;
            let tmpLabelHeight = canvasHeight;

            switch (geometryType) {
                case (<any>ol.geom).GeometryType.POINT:
                    flatCoordinates = geometry.getFlatCoordinates();
                    break;
                case (<any>ol.geom).GeometryType.MULTI_POINT:
                    flatCoordinates = geometry.getCenter();
                    break;
                case (<any>ol.geom).GeometryType.LINE_STRING:
                    // flatCoordinates = /** @type {ol.geom.LineString} */ (geometry).getFlatMidpoint();
                    flatCoordinates = geometry.getFlatCoordinates();
                    break;
                case (<any>ol.geom).GeometryType.CIRCLE:
                    flatCoordinates = /** @type {ol.geom.Circle} */ (geometry).getCenter();
                    break;
                case (<any>ol.geom).GeometryType.MULTI_LINE_STRING:
                    // flatCoordinates = /** @type {ol.geom.MultiLineString} */ (geometry).getFlatMidpoints();
                    flatCoordinates = geometry.getFlatCoordinates();
                    break;
                case (<any>ol.geom).GeometryType.POLYGON:
                    flatCoordinates = /** @type {ol.geom.Polygon} */ (geometry).getFlatInteriorPoint();
                    if (flatCoordinates[2] / resolution < tmpLabelWidth) {
                        flatCoordinates = undefined;
                    }
                    break;
                case (<any>ol.geom).GeometryType.MULTI_POLYGON:
                    let interiorPoints = /** @type {ol.geom.MultiPolygon} */ (geometry).getFlatInteriorPoints();
                    // flatCoordinates = interiorPoints;
                    flatCoordinates = [];
                    for (let i = 0, ii = interiorPoints.length; i < ii; i += 3) {
                        if (interiorPoints[i + 2] / resolution >= tmpLabelWidth) {
                            flatCoordinates.push(interiorPoints[i], interiorPoints[i + 1]);
                        }
                    }
                    if (!flatCoordinates.length) {
                        return;
                    }
                    break;
                default:
            }

            // let textLabelingStrategy = new TextLabelingStrategy();
            // flatCoordinates = textLabelingStrategy.markLocation(flatCoordinates, tmpLabelWidth, tmpLabelHeight, resolution, geometryType, this, strategyTree, frameState);

            if (flatCoordinates === undefined) { return false; }

            var labelObj = this.getImageDrawingOptions(text, textState, labelInfo, this.opacity);

            if (labelObj.canvas === undefined) {
                return;
            }

            (<any>textState).label ="a";
            (<any>textState).imageDrawingOptions = labelObj.imageDrawingOptions;
        }
        (<any>textState).labelPosition = flatCoordinates;

        return true;
    }

    getLabelInfo(text: string, textStyle: ol.style.Text) {
        var key = text + this.uid;
        if (!this.labelInfos.containsKey(key)) {
            // gets drawing font.
            let font = textStyle.getFont();

            // gets storke width.
            let strokeStyle = textStyle.getStroke();
            let strokeWidth = strokeStyle ? strokeStyle.getWidth() : 0;

            // gets letterSpacing.
            let letterSpacing = this.letterSpacing;

            // gets line spacing.
            let lineSpacing = this.lineSpacing;

            // gets the wrap width, warp the line which has wrap character and the width is bigger than wrap width.
            let wrapWidth = this.wrapWidth;

            // TODO whether to keep it or not, currently is keep it but with out implement.
            let wrapBefore = this.wrapBefore;

            // default wrap character.
            let wrapCharacter = " ";

            // warps text and measure width.
            let linesInfo = this.getWrapedTextAndWidths(text, font, strokeWidth, letterSpacing, lineSpacing, wrapWidth, wrapCharacter, wrapBefore);
            // gets height of one line
            let lineHeight = this.getTextHeight(font, strokeWidth);

            let linesWidths = linesInfo.widths;
            let textWidth = linesInfo.maxWidth;

            let textHeight = lineHeight;
            if (linesInfo.lines.length >= 2) {
                textHeight += (linesInfo.lines.length - 1) * (lineHeight + lineSpacing);
            }

            let textScale = textStyle.getScale();
            textScale = textScale === undefined ? 1 : textScale;
            let scale = textScale * window.devicePixelRatio;

            let labelWidth = Math.ceil((textWidth));
            let labelHeight = Math.ceil((textHeight);

            let labelInfo = {
                labelWidth: labelWidth,
                labelHeight: labelHeight,
                linesInfo: linesInfo,
                lineHeight: lineHeight,
                strokeWidth: strokeWidth,
                lineSpacing: lineSpacing,
                scale: scale
            };
            this.labelInfos.set(key, labelInfo);
        }

        return this.labelInfos.get(key);
    }
    getWrapedTextAndWidths(text, font, strokeWidth, letterSpacing, lineSpacing, wrapWidth, wrapCharacter, wrapBefore): string {
        let resultLines = [];
        let resultLineWidths = [];
        let maxWidth = 0;

        if (text !== "") {
            let lines = text.split('\n');
            let widths = [];
            let width = this.measureLinesWidths(lines, font, strokeWidth, letterSpacing, widths);

            if (wrapWidth > 0 && text.includes(wrapCharacter)) {
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    let lineWidth = widths[i];
                    if (lineWidth > wrapWidth && line.includes(wrapCharacter)) {
                        let tempLineWidths = [];
                        let tempLines = this.warpLine(line, wrapWidth, font, strokeWidth, letterSpacing, wrapCharacter, tempLineWidths);

                        for (let j = 0; j < tempLines.length; j++) {
                            resultLines.push(tempLines[j]);
                            resultLineWidths.push(tempLineWidths[j]);
                            if (tempLineWidths[j] > maxWidth) {
                                maxWidth = tempLineWidths[j];
                            }
                        }
                    }
                    else {
                        resultLines.push(line);
                        resultLineWidths.push(lineWidth);
                        if (lineWidth > maxWidth) {
                            maxWidth = lineWidth;
                        }
                    }
                }
            }
            else {
                resultLines = lines;
                resultLineWidths = widths;
                maxWidth = width;
            }
        }

        return {
            lines: resultLines,
            widths: resultLineWidths,
            maxWidth: maxWidth
        };
    }
    measureLinesWidths(lines, font, strokeWidth, letterSpacing, widths) {
        let tempContext = GeoTextStyle.getMeasureContext(letterSpacing);
        tempContext.font = font;
        tempContext.lineWidth = strokeWidth;
        tempContext.lineJoin = "round";

        let maxWidth = 0;
        for (var i = 0; i < lines.length; i++) {
            let line = lines[i];
            let lineWidth = 0;
            var char;
            var charWidth = 0;
            for (var j = 0; j < line.length; j++) {
                char = line[j];
                charWidth = this.charWidths[char];
                if (charWidth === undefined) {
                    charWidth = tempContext.measureText(char).width;
                    this.charWidths[char] = charWidth;
                }
                lineWidth += charWidth;
            }
            lineWidth = Math.ceil(lineWidth - letterSpacing + strokeWidth);
            widths.push(lineWidth);
            if (lineWidth > maxWidth) {
                maxWidth = lineWidth;
            }
        }
        return maxWidth;
    }
    warpLine(line, wrapWidth, font, strokeWidth, letterSpacing, wrapCharacter, lineWidths) {
        let lines = [];

        let words = line.split(wrapCharacter);
        let tempContext = GeoTextStyle.getMeasureContext(letterSpacing);
        tempContext.font = font;
        tempContext.lineWidth = strokeWidth;
        tempContext.lineJoin = "round";
        if (words.length === 1) {
            let testLine = words[0];
            let testWidth = Math.ceil(tempContext.measureText(testLine).width - letterSpacing + strokeWidth);
            lines.push(words[0]);
            lineWidths.push(testWidth);
        }
        else {
            let measureLine = words[0];
            let measureWidth = Math.ceil(tempContext.measureText(measureLine).width - letterSpacing + strokeWidth);

            let testLine;
            let testWidth;
            for (let n = 1; n < words.length; n++) {
                testLine = measureLine + " " + words[n];
                testWidth = Math.ceil(tempContext.measureText(testLine).width - letterSpacing + strokeWidth);
                if (testWidth > wrapWidth) {
                    lines.push(measureLine);
                    lineWidths.push(measureWidth);

                    measureLine = words[n];
                    measureWidth = Math.ceil(tempContext.measureText(measureLine).width - letterSpacing + strokeWidth);
                }
                else {
                    measureLine = testLine;
                    measureWidth = testWidth;
                }
                if (n == words.length - 1) {
                    lines.push(measureLine);
                    lineWidths.push(measureWidth);
                }
            }
        }
        return lines;
    }
    getTextHeight(font, strokeWidth) {
        let lineHeight = (<any>ol.render.canvas).measureTextHeight(font);
        return lineHeight + strokeWidth;
    }

    getImageDrawingOptions(text: any, textStyle: ol.style.Text, labelInfo: any, opacity) {
        var imageDrawingOptionsCache = (<any>ol).render.canvas.labelCache;
        var key = (<any>ol).getUid(this);
        key += text;
        if (!imageDrawingOptionsCache.containsKey(key)) {
            let imageDrawingOptions = {
                labelInfo: labelInfo,
                style: textStyle,
                letterSpacing: this.letterSpacing,
                lineSpacing: this.lineSpacing,
                align: this.align,
                maskType: this.maskType,
                maskMarginList: this.maskMarginList,
                maskStrokeWidth: this.maskStrokeWidth,
                opacity: opacity,
                maskType: this.maskType,
                maskColor: this.maskColor,
                maskOutlineColor: this.maskOutlineColor,
                maskOutlineWidth: this.maskOutlineWidth
            };

            var canvasSizeInfoWithMask = this.getCanvasSizeByMaskType(labelInfo.labelWidth, labelInfo.labelHeight, this.maskType, this.maskMarginList, this.maskStrokeWidth);
            imageDrawingOptions.canvasSizeInfoWithMask = canvasSizeInfoWithMask;

            let canvas="a"; //= this.drawImage(imageDrawingOptions);
            let labelObj = {
                canvas: canvas,
                imageDrawingOptions
            }
            imageDrawingOptionsCache.set(key, labelObj);
        }

        return imageDrawingOptionsCache.get(key);
    }

    drawImage(drawOptions) {
        var labelInfo = drawOptions.labelInfo;
        var textStyle = drawOptions.style;
        var letterSpacing = drawOptions.letterSpacing;
        var lineSpacing = drawOptions.lineSpacing;
        var align = drawOptions.align;
        var maskType = drawOptions.maskType;
        var maskMarginList = drawOptions.maskMarginList
        var maskStrokeWidth = drawOptions.maskStrokeWidth;
        var opacity = drawOptions.opacity;
        var maskType = drawOptions.maskType;
        var maskColor = drawOptions.maskColor;
        var maskOutlineColor = drawOptions.maskOutlineColor;
        var maskOutlineWidth = drawOptions.maskOutlineWidth;
        var canvasSizeInfoWithMask = drawOptions.canvasSizeInfoWithMask;

        var strokeStyle = textStyle.getStroke();
        var fillStyle = textStyle.getFill();

        var scale = labelInfo.scale;
        var labelHeight = labelInfo.labelHeight;
        var labelWidth = labelInfo.labelWidth;
        var lineHeight = labelInfo.lineHeight;
        var strokeWidth = strokeStyle ? strokeStyle.getWidth() : 0;

        var canvasWidth = labelWidth;
        var canvasHeight = labelHeight;
        var textAnchorX = 0;
        var textAnchorY = 0;

        canvasWidth = canvasSizeInfoWithMask[0];
        canvasHeight = canvasSizeInfoWithMask[1];
        textAnchorX = canvasSizeInfoWithMask[2];
        textAnchorY = canvasSizeInfoWithMask[3];

        var canvas = GeoTextStyle.createCanvas(canvasWidth * scale, canvasHeight * scale);

        // For letterSpacing we need appendChild
        var body;
        if (letterSpacing) {
            body = document.getElementsByTagName("body")[0];
            if (body) {
                canvas.style.display = "none";
                body.appendChild(canvas);
            }
            canvas.style.letterSpacing = letterSpacing + "px";
        }

        var context = canvas.getContext("2d");

        context.globalAlpha = opacity || 1;
        if (scale !== 1) {
            context.scale(scale, scale);
        }
        context["currentScale"] = scale;

        this.drawMask(context, maskType, maskColor, maskOutlineColor, maskOutlineWidth);

        // set the property of canvas.
        context.font = textStyle.getFont();
        context.lineWidth = strokeWidth;
        context.lineJoin = "round";

        var x = textAnchorX;
        var y = -lineHeight - lineSpacing + textAnchorY;

        var letterSpacingOffset = letterSpacing;
        var alignOffsetX = 0;
        var canvasTextAlign = "center";
        if (align == "left") {
            alignOffsetX = Math.ceil(strokeWidth / 2);
            canvasTextAlign = "left";
        }
        else if (align == "right") {
            alignOffsetX = Math.floor(labelWidth - strokeWidth / 2 + letterSpacing);
            canvasTextAlign = "right";
        }
        else {
            alignOffsetX = Math.floor((labelWidth) / 2 + letterSpacingOffset / 2);
        }

        var linesInfo = labelInfo.linesInfo;
        var lines = linesInfo.lines;
        for (var i = 0; i < lines.length; i++) {
            y += lineHeight + lineSpacing;
            let line = lines[i];

            // context.fillStyle = "#FF00FF99";
            // context.fillRect(x, y, labelWidth, lineHeight);

            context.textAlign = canvasTextAlign;
            context.textBaseline = 'middle';
            var anchorX = x + alignOffsetX;
            var anchorY = y + lineHeight / 2;
            if (strokeStyle) {
                context.strokeStyle = strokeStyle.getColor();
                context.strokeText(line, anchorX, anchorY);
            }

            context.fillStyle = fillStyle.getColor();
            context.fillText(line, anchorX, anchorY);
        }
        if (this.letterSpacing && body) {
            body.removeChild(canvas);
        }

        return canvas;
    }

    drawMask(context, maskType, maskColor, maskOutlineColor, maskOutlineWidth) {
        let fill = undefined;
        let stroke = undefined;

        if (maskColor) {
            fill = new ol.style.Fill();
            fill.setColor(maskColor);
        }

        if (maskOutlineColor && maskOutlineWidth) {
            stroke = new ol.style.Stroke();
            if (maskOutlineColor) {
                stroke.setColor(maskOutlineColor);
            }
            if (maskOutlineWidth) {
                stroke.setWidth(maskOutlineWidth ? maskOutlineWidth : 0);
            }
        }

        switch (maskType) {
            case "default":
            case "Default":
            case "rectangle":
            case "Rectangle":
                this.drawRectangle(context, fill, stroke);
                break;
            case "roundedCorners":
            case "RoundedCorners":
                this.drawRoundedCorners(context, fill, stroke);
                break;
            case "roundedEnds":
            case "RoundedEnds":
                this.drawRoundedEnds(context, fill, stroke);
                break;
            case "circle":
            case "Circle":
                this.drawCircle(context, fill, stroke);
                break;
        }
    }

    ///////////////////////
    ////private method

    getTextWithNumericFormat(numericFormat, featureText: string): string {
        let tmpArguments = numericFormat.split(",");
        let numericFormatOptions = {};
        for (let tmpArgument of tmpArguments) {
            let keyValuePair = tmpArgument.split(":");
            switch (keyValuePair[0].trim()) {
                case "localeMatcher":
                    (<any>numericFormatOptions).localeMatcher = keyValuePair[1].trim();
                    break;
                case "style":
                    (<any>numericFormatOptions).style = keyValuePair[1].trim();
                    break;
                case "currency":
                    (<any>numericFormatOptions).currency = keyValuePair[1].trim();
                    break;
                case "currencyDisplay":
                    (<any>numericFormatOptions).currencyDisplay = keyValuePair[1].trim();
                    break;
                case "useGrouping":
                    (<any>numericFormatOptions).useGrouping = keyValuePair[1].trim();
                    break;
                case "minimumIntegerDigits":
                    (<any>numericFormatOptions).minimumIntegerDigits = keyValuePair[1].trim();
                    break;
                case "minimumFractionDigits":
                    (<any>numericFormatOptions).minimumFractionDigits = keyValuePair[1].trim();
                    break;
                case "maximumFractionDigits":
                    (<any>numericFormatOptions).maximumFractionDigits = keyValuePair[1].trim();
                    break;
                case "minimumSignificantDigits":
                    (<any>numericFormatOptions).minimumSignificantDigits = keyValuePair[1].trim();
                    break;
                case "maximumSignificantDigits":
                    (<any>numericFormatOptions).maximumSignificantDigits = keyValuePair[1].trim();
                    break;
            }
        }
        let numeric = new Intl.NumberFormat(tmpArguments[0], numericFormatOptions);
        let num = Number(featureText);
        if (num) {
            return numeric.format(num);
        }
        else {
            return featureText;
        }
    }
    getTextWithDateFormat(dateFormat, featureText: string): string {
        if (Date.parse(featureText)) {
            let date = new Date(featureText);
            let fmt = dateFormat;
            let o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            };
            if (/(y+)/.test(fmt))
                fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (let k in o)
                if (new RegExp("(" + k + ")").test(fmt))
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));

            return fmt;
        }
        else {
            return featureText;
        }
    }
    getTextWithContent(contentFormat: string, feature: any, dateFormat, numericFormat): string {
        var str = contentFormat || "";
        if (this.contentFormatItems && this.contentFormatItems.length > 0) {
            var args = feature.getProperties();

            for (var itemIndex = 0; itemIndex < this.contentFormatItems.length; itemIndex++) {
                var item = this.contentFormatItems[itemIndex];
                var value = "";
                if (args[item]) {
                    value = args[item]
                }
                else {
                    var items = item.split(',');
                    var element;
                    for (let index = 0; index < items.length; index++) {
                        element = items[index];
                        if (args[element]) {
                            value = args[element]
                            break;
                        }
                    }
                }

                str = str.replace("{" + item + "}", value]
            }
        }

        return str;
    }

    getTextWithLetterCase(letterCase, featureText: string) {
        if (featureText !== undefined) {
            switch (letterCase) {
                case "uppercase":
                    featureText = featureText.toLocaleUpperCase();
                    break;
                case "lowercase":
                    featureText = featureText.toLocaleLowerCase();
                    break;
                default:
                    break;
            }
        }
        return featureText;
    }

    getMargin(marginString) {
        let result = [0, 0, 0, 0];
        if (marginString) {
            let tmpMaskMargin = marginString.split(',');
            switch (tmpMaskMargin.length) {
                case 1:
                    var value = parseInt(tmpMaskMargin[0]);
                    result = [value, value, value, value];
                    break;
                case 2:
                    var height = parseInt(tmpMaskMargin[0]);
                    var width = parseInt(tmpMaskMargin[1]);
                    result = [height, width, height, width];
                    break;
                case 3:
                    var top = parseInt(tmpMaskMargin[0]);
                    var right = parseInt(tmpMaskMargin[1]);
                    var bottom = parseInt(tmpMaskMargin[2]);
                    var left = right;
                    result = [top, right, bottom, left];
                    break;
                default:
                    var top = parseInt(tmpMaskMargin[0]);
                    var right = parseInt(tmpMaskMargin[1]);
                    var bottom = parseInt(tmpMaskMargin[2]);
                    var left = parseInt(tmpMaskMargin[3]);
                    result = [top, right, bottom, left];
                    break;
            }
        }

        return result;
    }

    drawRectangle(context: any, fill: ol.style.Fill, stroke: ol.style.Stroke) {
        var x = 0;
        var y = 0;
        var width = context.canvas.width;
        var height = context.canvas.height;

        var scale = context["currentScale"] || 1;

        width = width / scale;
        height = height / scale;


        var strokeWidth = 0;
        var halfStrokeWidth = 0;
        var doubleStrokeWidth = 0;

        if (stroke) {
            strokeWidth = stroke.getWidth();
            halfStrokeWidth = strokeWidth / 2;
            doubleStrokeWidth = strokeWidth * 2;
        }

        if (fill) {
            context.fillStyle = fill.getColor();
            context.fillRect(x + strokeWidth, y + strokeWidth, width - doubleStrokeWidth, height - doubleStrokeWidth);
        }

        if (stroke) {
            context.lineWidth = strokeWidth;
            context.strokeStyle = stroke.getColor();
            context.strokeRect(x + halfStrokeWidth, y + halfStrokeWidth, width - strokeWidth, height - strokeWidth);
        }

        // context.lineWidth = 1;
        // context.strokeStyle = "#000";
        // context.strokeRect(x, y, width, height);

        // context.fillStyle = "#00ff00";
        // context.fillRect(x, y + height / 2, width, 2);
        // context.fillRect(x + (width / 2), y, 1, height);
    }

    drawRoundedCorners(context: any, fill: ol.style.Fill, stroke: ol.style.Stroke) {
        var x = 0;
        var y = 0;
        var width = context.canvas.width;
        var height = context.canvas.height;

        var scale = context["currentScale"] || 1;

        width = width / scale;
        height = height / scale;

        let radius = (width < height ? width : height) * 0.25;
        radius = radius >= 5 ? 5 : radius;

        var strokeWidth = 0;
        var halfStrokeWidth = 0;
        var doubleStrokeWidth = 0;

        if (stroke) {
            strokeWidth = stroke.getWidth();
            halfStrokeWidth = strokeWidth / 2;
            doubleStrokeWidth = strokeWidth * 2;
        }

        let upperLeft = [strokeWidth, strokeWidth];
        let upperRight = [width - strokeWidth, strokeWidth];
        let bottomLeft = [strokeWidth, height - strokeWidth];
        let bottomRight = [width - strokeWidth, height - strokeWidth];

        if (fill) {
            context.beginPath();
            context.moveTo(upperLeft[0] + radius, upperLeft[1]);
            context.lineTo(upperRight[0] - radius, upperRight[1]);
            context.arc(upperRight[0] - radius, upperRight[1] + radius, radius, 1.5 * Math.PI, 0);
            context.lineTo(upperRight[0], upperRight[1] + radius);
            context.lineTo(bottomRight[0], bottomRight[1] - radius);
            context.arc(bottomRight[0] - radius, bottomRight[1] - radius, radius, 0, 0.5 * Math.PI);
            context.lineTo(bottomRight[0] - radius, bottomRight[1]);
            context.lineTo(bottomLeft[0] + radius, bottomLeft[1]);
            context.arc(bottomLeft[0] + radius, bottomLeft[1] - radius, radius, 0.5 * Math.PI, 1 * Math.PI);
            context.lineTo(bottomLeft[0], bottomLeft[1] - radius);
            context.lineTo(upperLeft[0], upperLeft[1] + radius);
            context.arc(upperLeft[0] + radius, upperLeft[1] + radius, radius, 1 * Math.PI, 1.5 * Math.PI);
            context.closePath();
            context.fillStyle = fill.getColor();
            context.fill();
        }

        if (stroke) {
            radius += halfStrokeWidth;
            upperLeft = [halfStrokeWidth, halfStrokeWidth];
            upperRight = [width - halfStrokeWidth, halfStrokeWidth];
            bottomLeft = [halfStrokeWidth, height - halfStrokeWidth];
            bottomRight = [width - halfStrokeWidth, height - halfStrokeWidth];

            context.beginPath();
            context.moveTo(upperLeft[0] + radius, upperLeft[1]);
            context.lineTo(upperRight[0] - radius, upperRight[1]);
            context.arc(upperRight[0] - radius, upperRight[1] + radius, radius, 1.5 * Math.PI, 0);
            context.lineTo(upperRight[0], upperRight[1] + radius);
            context.lineTo(bottomRight[0], bottomRight[1] - radius);
            context.arc(bottomRight[0] - radius, bottomRight[1] - radius, radius, 0, 0.5 * Math.PI);
            context.lineTo(bottomRight[0] - radius, bottomRight[1]);
            context.lineTo(bottomLeft[0] + radius, bottomLeft[1]);
            context.arc(bottomLeft[0] + radius, bottomLeft[1] - radius, radius, 0.5 * Math.PI, 1 * Math.PI);
            context.lineTo(bottomLeft[0], bottomLeft[1] - radius);
            context.lineTo(upperLeft[0], upperLeft[1] + radius);
            context.arc(upperLeft[0] + radius, upperLeft[1] + radius, radius, 1 * Math.PI, 1.5 * Math.PI);
            context.closePath();
            context.lineWidth = stroke.getWidth();
            context.strokeStyle = stroke.getColor();
            context.stroke();
        }

        // context.lineWidth = 1;
        // context.strokeStyle = "#000";
        // context.strokeRect(0, 0, width, height);

        // context.fillStyle = "#00ff00";
        // context.fillRect(0, 0 + height / 2, width, 2);
        // context.fillRect(0 + (width / 2), 0, 1, height);
    }
    drawRoundedEnds(context: any, fill: ol.style.Fill, stroke: ol.style.Stroke) {
        var x = 0;
        var y = 0;
        var width = context.canvas.width;
        var height = context.canvas.height;
        var scale = context["currentScale"] || 1;

        width = width / scale;
        height = height / scale;

        var radius = height / 2;

        var strokeWidth = 0;
        var halfStrokeWidth = 0;
        var doubleStrokeWidth = 0;

        if (stroke) {
            strokeWidth = stroke.getWidth();
            halfStrokeWidth = strokeWidth / 2;
            doubleStrokeWidth = strokeWidth * 2;
        }

        let upperLeft = [0, 0];
        let upperRight = [width, 0];
        let bottomLeft = [0, height];
        let bottomRight = [width, height];


        if (fill) {
            var innerRadius = radius - strokeWidth;
            context.beginPath();
            context.moveTo(upperLeft[0] + radius, upperLeft[1] + strokeWidth);
            context.lineTo(upperRight[0] - radius, upperRight[1] + strokeWidth);
            context.arc(width - radius, radius, innerRadius, 1.5 * Math.PI, 0.5 * Math.PI);
            context.lineTo(bottomRight[0] - radius, bottomRight[1] - strokeWidth);
            context.lineTo(bottomLeft[0] + radius, bottomLeft[1] - strokeWidth);
            context.arc(radius, radius, innerRadius, 0.5 * Math.PI, 1.5 * Math.PI);
            context.closePath();
            context.fillStyle = fill.getColor();
            context.fill();
        }
        if (stroke) {
            var innerRadius = radius - halfStrokeWidth;
            context.beginPath();
            context.moveTo(upperLeft[0] + radius, upperLeft[1] + halfStrokeWidth);
            context.lineTo(upperRight[0] - radius, upperRight[1] + halfStrokeWidth);
            context.arc(width - radius, radius, innerRadius, 1.5 * Math.PI, 0.5 * Math.PI);
            context.lineTo(bottomRight[0] - radius, bottomRight[1] - halfStrokeWidth);
            context.lineTo(bottomLeft[0] + radius, bottomLeft[1] - halfStrokeWidth);
            context.arc(radius, radius, innerRadius, 0.5 * Math.PI, 1.5 * Math.PI);
            context.closePath();
            context.lineWidth = stroke.getWidth();
            context.strokeStyle = stroke.getColor();
            context.stroke();
        }

        // context.lineWidth = 1;
        // context.strokeStyle = "#000";
        // context.strokeRect(0, 0, width, height);

        // context.fillStyle = "#00ff00";
        // context.fillRect(0, 0 + height / 2, width, 2);
        // context.fillRect(0 + (width / 2), 0, 1, height);
    }
    drawCircle(context: any, fill: ol.style.Fill, stroke: ol.style.Stroke) {
        var x = 0;
        var y = 0;
        var width = context.canvas.width;
        var height = context.canvas.height;

        var scale = context["currentScale"] || 1;

        width = width / scale;
        height = height / scale;

        var strokeWidth = 0;
        var halfStrokeWidth = 0;
        var doubleStrokeWidth = 0;

        if (stroke) {
            strokeWidth = stroke.getWidth();
            halfStrokeWidth = strokeWidth / 2;
            doubleStrokeWidth = strokeWidth * 2;
        }

        if (fill) {
            let radius = width / 2 - strokeWidth;
            context.beginPath();
            context.arc(width / 2, width / 2, radius, 0, 2 * Math.PI);
            context.closePath();
            context.fillStyle = fill.getColor();
            context.fill();
        }

        if (stroke) {
            let radius = width / 2 - halfStrokeWidth;
            context.beginPath();
            context.arc(width / 2, width / 2, radius, 0, 2 * Math.PI);
            context.closePath();
            context.lineWidth = strokeWidth;
            context.strokeStyle = stroke.getColor();
            context.stroke();
        }

        // context.lineWidth = 1;
        // context.strokeStyle = "#000";
        // context.strokeRect(0, 0, width, height);

        // context.fillStyle = "#00ff00";
        // context.fillRect(0, 0 + height / 2, width, 2);
        // context.fillRect(0 + (width / 2), 0, 1, height);
    }

    getCanvasSizeByMaskType(canvasWidth, canvasHeight, maskType, maskMarginList, maskStrokeWidth) {
        var textAnchorX = 0;
        var textAnchorY = 0;
        if (maskType) {
            canvasHeight += maskMarginList[0];
            textAnchorY += maskMarginList[0];

            canvasWidth += maskMarginList[1];

            canvasHeight += maskMarginList[2];

            canvasWidth += maskMarginList[3];
            textAnchorX += maskMarginList[3];

            switch (this.maskType) {
                case "default":
                case "Default":
                case "rectangle":
                case "Rectangle":
                    canvasWidth += maskStrokeWidth * 2;
                    canvasHeight += maskStrokeWidth * 2;
                    textAnchorX += maskStrokeWidth;
                    textAnchorY += maskStrokeWidth;
                    break;
                case "roundedCorners":
                case "RoundedCorners":
                    let radius = Math.min(canvasWidth, canvasHeight) * 0.25;
                    radius = radius >= 5 ? 5 : radius;

                    let addedValue = (radius + maskStrokeWidth);
                    let doubAddedValue = addedValue * 2;
                    canvasWidth += doubAddedValue;
                    canvasHeight += doubAddedValue;
                    textAnchorX += addedValue;
                    textAnchorY += addedValue;
                    break;
                case "roundedEnds":
                case "RoundedEnds":
                    canvasHeight += maskStrokeWidth * 2;
                    let radius = canvasHeight / 2;
                    canvasWidth += radius * 2;
                    textAnchorX += radius;
                    textAnchorY += maskStrokeWidth;
                    break;
                case "circle":
                case "Circle":
                    var halfCanvasWidth = canvasWidth / 2;
                    var halfCanvasHeight = canvasHeight / 2;
                    let radius = Math.sqrt(Math.pow(halfCanvasWidth, 2) + Math.pow(halfCanvasHeight, 2));
                    radius = Math.ceil(radius);
                    canvasWidth = radius * 2 + maskStrokeWidth * 2;
                    canvasHeight = canvasWidth;

                    textAnchorX += radius - halfCanvasWidth + maskStrokeWidth;
                    textAnchorY += radius - halfCanvasHeight + maskStrokeWidth;

                    break;
            }
        }

        return [canvasWidth, canvasHeight, textAnchorX, textAnchorY];
    }

    static getMeasureContext(letterSpacing) {
        let tempCanvasForMeasure = GeoTextStyle.getMeasureCanvas();
        let letterSpacingStyle = letterSpacing + "px";
        if (tempCanvasForMeasure.style.letterSpacing != letterSpacingStyle) {
            tempCanvasForMeasure.style.letterSpacing = letterSpacingStyle;

            GeoTextStyle.measureContext = tempCanvasForMeasure.getContext('2d');
        }

        return GeoTextStyle.measureContext;
    }

    static getMeasureCanvas() {
        if (!GeoTextStyle.measureCanvas) {
            GeoTextStyle.measureCanvas = GeoTextStyle.createCanvas(1, 1);
            GeoTextStyle.measureCanvas.style.display = "none";
            let body = document.getElementsByTagName("body")[0];
            if (body) {
                body.appendChild(GeoTextStyle.measureCanvas);
            }
        }
        return GeoTextStyle.measureCanvas;
    }

    static createCanvas(opt_width, opt_height) {
        const canvas = (document.createElement('canvas'));
        if (opt_width) {
            canvas.width = opt_width;
        }
        if (opt_height) {
            canvas.height = opt_height;
        }

        return canvas;
    }


    BATCH_CONSTRUCTORS_DEFAULT = {
        Point: TextLabelingStrategy,
        MultiPoint: TextLabelingStrategy,
        LineString: TextLabelingStrategy,
        Circle: TextLabelingStrategy,
        MultiLineString: TextLabelingStrategy,
        Polygon: TextLabelingStrategy,
        MultiPolygon: TextLabelingStrategy
    };

    BATCH_CONSTRUCTORS_DETECT = {
        Point: DetectTextLabelingStrategy,
        MultiPoint: DetectTextLabelingStrategy,
        LineString: DetectTextLabelingStrategy,
        Circle: DetectTextLabelingStrategy,
        MultiLineString: DetectTextLabelingStrategy,
        Polygon: DetectTextLabelingStrategy,
        MultiPolygon: DetectTextLabelingStrategy
    };
}