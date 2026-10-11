import * as i0 from '@angular/core';
import { EventEmitter, inject, Renderer2, ViewChild, Output, Input, ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { toDataURL, toCanvas, toString } from 'qrcode';

class QRCodeComponent {
    allowEmptyString = false;
    colorDark = '#000000ff';
    colorLight = '#ffffffff';
    cssClass = 'qrcode';
    elementType = 'canvas';
    errorCorrectionLevel = 'M';
    imageSrc;
    imageHeight;
    imageWidth;
    margin = 4;
    qrdata = '';
    scale = 4;
    version;
    width = 10;
    // Accessibility features introduced in 13.0.4+
    alt;
    ariaLabel;
    title;
    qrCodeURL = new EventEmitter();
    qrcElement;
    context = null;
    centerImage;
    renderVersion = 0;
    currentObjectUrl;
    renderer = inject(Renderer2);
    sanitizer = inject(DomSanitizer);
    async ngOnChanges() {
        this.renderVersion += 1;
        const currentVersion = this.renderVersion;
        await this.createQRCode(currentVersion);
    }
    ngOnDestroy() {
        this.revokeCurrentObjectUrl();
    }
    isValidQrCodeText(data) {
        if (this.allowEmptyString === false) {
            return !(typeof data === 'undefined' || data === '' || data === 'null' || data === null);
        }
        return !(typeof data === 'undefined');
    }
    toDataURL(data, qrCodeConfig) {
        return new Promise((resolve, reject) => {
            toDataURL(data, qrCodeConfig, (err, url) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(url);
                }
            });
        });
    }
    toCanvas(canvas, data, qrCodeConfig) {
        return new Promise((resolve, reject) => {
            toCanvas(canvas, data, qrCodeConfig, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    toSVG(data, qrCodeConfig) {
        return new Promise((resolve, reject) => {
            toString(data, qrCodeConfig, (err, url) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(url);
                }
            });
        });
    }
    renderElement(element) {
        for (const node of this.qrcElement.nativeElement.childNodes) {
            this.renderer.removeChild(this.qrcElement.nativeElement, node);
        }
        this.renderer.appendChild(this.qrcElement.nativeElement, element);
    }
    async createQRCode(renderVersion) {
        // Set sensitive defaults
        if (this.version && this.version > 40) {
            console.warn('[angularx-qrcode] max value for `version` is 40');
            this.version = 40;
        }
        else if (this.version && this.version < 1) {
            console.warn('[angularx-qrcode]`min value for `version` is 1');
            this.version = 1;
        }
        else if (this.version !== undefined && isNaN(this.version)) {
            console.warn('[angularx-qrcode] version should be a number, defaulting to auto.');
            this.version = undefined;
        }
        try {
            if (!this.isValidQrCodeText(this.qrdata)) {
                throw new Error('[angularx-qrcode] Field `qrdata` is empty, set \'allowEmptyString="true"\' to overwrite this behaviour.');
            }
            // This is a workaround to allow an empty string as qrdata
            const normalizedQrData = this.qrdata === '' ? ' ' : this.qrdata;
            const config = {
                color: {
                    dark: this.colorDark,
                    light: this.colorLight,
                },
                errorCorrectionLevel: this.errorCorrectionLevel,
                margin: this.margin,
                scale: this.scale,
                version: this.version,
                width: this.width,
            };
            const centerImageSrc = this.imageSrc;
            const centerImageHeight = this.imageHeight ? +this.imageHeight : 40;
            const centerImageWidth = this.imageWidth ? +this.imageWidth : 40;
            switch (this.elementType) {
                case 'canvas': {
                    const canvasElement = this.renderer.createElement('canvas');
                    const canvasContext = canvasElement.getContext('2d');
                    this.context = canvasContext;
                    this.toCanvas(canvasElement, normalizedQrData, config)
                        .then(() => {
                        if (renderVersion !== this.renderVersion) {
                            return;
                        }
                        if (this.ariaLabel) {
                            this.renderer.setAttribute(canvasElement, 'aria-label', `${this.ariaLabel}`);
                        }
                        if (this.title) {
                            this.renderer.setAttribute(canvasElement, 'title', `${this.title}`);
                        }
                        if (centerImageSrc && canvasContext) {
                            this.centerImage = new Image(centerImageWidth, centerImageHeight);
                            if (centerImageSrc !== this.centerImage.src) {
                                this.centerImage.crossOrigin = 'anonymous';
                                this.centerImage.src = centerImageSrc;
                            }
                            if (centerImageHeight !== this.centerImage.height) {
                                this.centerImage.height = centerImageHeight;
                            }
                            if (centerImageWidth !== this.centerImage.width) {
                                this.centerImage.width = centerImageWidth;
                            }
                            const centerImage = this.centerImage;
                            if (centerImage) {
                                centerImage.onload = () => {
                                    if (renderVersion !== this.renderVersion) {
                                        return;
                                    }
                                    canvasContext.drawImage(centerImage, canvasElement.width / 2 - centerImageWidth / 2, canvasElement.height / 2 - centerImageHeight / 2, centerImageWidth, centerImageHeight);
                                };
                            }
                        }
                        this.renderElement(canvasElement);
                        this.emitQRCodeURL(canvasElement);
                    })
                        .catch((e) => {
                        console.error('[angularx-qrcode] canvas error:', e);
                    });
                    break;
                }
                case 'svg': {
                    const svgParentElement = this.renderer.createElement('div');
                    this.toSVG(normalizedQrData, config)
                        .then((svgString) => {
                        if (renderVersion !== this.renderVersion) {
                            return;
                        }
                        this.renderer.setProperty(svgParentElement, 'innerHTML', svgString);
                        const svgElement = svgParentElement.firstChild;
                        this.renderer.setAttribute(svgElement, 'height', `${this.width}`);
                        this.renderer.setAttribute(svgElement, 'width', `${this.width}`);
                        this.renderElement(svgElement);
                        this.emitQRCodeURL(svgElement);
                    })
                        .catch((e) => {
                        console.error('[angularx-qrcode] svg error:', e);
                    });
                    break;
                }
                case 'url':
                case 'img':
                default: {
                    const imgElement = this.renderer.createElement('img');
                    this.toDataURL(normalizedQrData, config)
                        .then((dataUrl) => {
                        if (renderVersion !== this.renderVersion) {
                            return;
                        }
                        if (this.alt) {
                            imgElement.setAttribute('alt', this.alt);
                        }
                        if (this.ariaLabel) {
                            imgElement.setAttribute('aria-label', this.ariaLabel);
                        }
                        imgElement.setAttribute('src', dataUrl);
                        if (this.title) {
                            imgElement.setAttribute('title', this.title);
                        }
                        this.renderElement(imgElement);
                        this.emitQRCodeURL(imgElement);
                    })
                        .catch((e) => {
                        console.error('[angularx-qrcode] img/url error:', e);
                    });
                }
            }
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[angularx-qrcode] Error generating QR Code:', message);
        }
    }
    convertBase64ImageUrlToBlob(base64ImageUrl) {
        // split into two parts
        const parts = base64ImageUrl.split(';base64,');
        if (parts.length !== 2) {
            throw new Error('[angularx-qrcode] Invalid base64 image URL.');
        }
        // hold the content/mime type f.e. image/png
        const imageType = parts[0].split(':')[1];
        if (!imageType) {
            throw new Error('[angularx-qrcode] Missing image MIME type.');
        }
        // decode base64 string
        const decodedData = atob(parts[1]);
        // create unit8array of size same as row data length
        const uInt8Array = new Uint8Array(decodedData.length);
        // insert all character code into uint8array
        for (let i = 0; i < decodedData.length; ++i) {
            uInt8Array[i] = decodedData.charCodeAt(i);
        }
        // return blob image after conversion
        return new Blob([uInt8Array], { type: imageType });
    }
    revokeCurrentObjectUrl() {
        if (!this.currentObjectUrl) {
            return;
        }
        URL.revokeObjectURL(this.currentObjectUrl);
        this.currentObjectUrl = undefined;
    }
    emitObjectUrl(url) {
        this.revokeCurrentObjectUrl();
        this.currentObjectUrl = url;
        const urlSanitized = this.sanitizer.bypassSecurityTrustUrl(url);
        this.qrCodeURL.emit(urlSanitized);
    }
    emitQRCodeURL(element) {
        const className = element.constructor.name;
        if (className === SVGSVGElement.name) {
            const svgHTML = element.outerHTML;
            const blob = new Blob([svgHTML], { type: 'image/svg+xml' });
            const urlSvg = URL.createObjectURL(blob);
            this.emitObjectUrl(urlSvg);
            return;
        }
        let urlImage = '';
        if (className === HTMLCanvasElement.name) {
            urlImage = element.toDataURL('image/png');
        }
        if (className === HTMLImageElement.name) {
            urlImage = element.src;
        }
        const blobData = this.convertBase64ImageUrlToBlob(urlImage);
        const urlBlob = URL.createObjectURL(blobData);
        this.emitObjectUrl(urlBlob);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.0.7", ngImport: i0, type: QRCodeComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "22.0.7", type: QRCodeComponent, isStandalone: true, selector: "qrcode", inputs: { allowEmptyString: "allowEmptyString", colorDark: "colorDark", colorLight: "colorLight", cssClass: "cssClass", elementType: "elementType", errorCorrectionLevel: "errorCorrectionLevel", imageSrc: "imageSrc", imageHeight: "imageHeight", imageWidth: "imageWidth", margin: "margin", qrdata: "qrdata", scale: "scale", version: "version", width: "width", alt: "alt", ariaLabel: "ariaLabel", title: "title" }, outputs: { qrCodeURL: "qrCodeURL" }, viewQueries: [{ propertyName: "qrcElement", first: true, predicate: ["qrcElement"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: `<div #qrcElement [class]="cssClass"></div>`, isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.0.7", ngImport: i0, type: QRCodeComponent, decorators: [{
            type: Component,
            args: [{
                    // eslint-disable-next-line @angular-eslint/component-selector
                    selector: 'qrcode',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    template: `<div #qrcElement [class]="cssClass"></div>`,
                }]
        }], propDecorators: { allowEmptyString: [{
                type: Input
            }], colorDark: [{
                type: Input
            }], colorLight: [{
                type: Input
            }], cssClass: [{
                type: Input
            }], elementType: [{
                type: Input
            }], errorCorrectionLevel: [{
                type: Input
            }], imageSrc: [{
                type: Input
            }], imageHeight: [{
                type: Input
            }], imageWidth: [{
                type: Input
            }], margin: [{
                type: Input
            }], qrdata: [{
                type: Input
            }], scale: [{
                type: Input
            }], version: [{
                type: Input
            }], width: [{
                type: Input
            }], alt: [{
                type: Input
            }], ariaLabel: [{
                type: Input
            }], title: [{
                type: Input
            }], qrCodeURL: [{
                type: Output
            }], qrcElement: [{
                type: ViewChild,
                args: ['qrcElement', { static: true }]
            }] } });

/*
 * Public API Surface of angularx-qrcode
 */

/**
 * Generated bundle index. Do not edit.
 */

export { QRCodeComponent };
//# sourceMappingURL=angularx-qrcode.mjs.map
