L.drawLocal.draw.handlers.ellipse = {tooltip: {start: "Click and drag to draw ellipse."}}
L.drawLocal.draw.toolbar.buttons.ellipse = "Draw a ellipse";
L.DrawToolbar.include({
    getModeHandlers: function (map) {
        return [
            {
                enabled: this.options.polyline,
                handler: new L.Draw.Polyline(map, this.options.polyline),
                title: L.drawLocal.draw.toolbar.buttons.polyline
            },
            {
                enabled: this.options.polygon,
                handler: new L.Draw.Polygon(map, this.options.polygon),
                title: L.drawLocal.draw.toolbar.buttons.polygon
            },
            {
                enabled: this.options.rectangle,
                handler: new L.Draw.Rectangle(map, this.options.rectangle),
                title: L.drawLocal.draw.toolbar.buttons.rectangle
            },
            {
                enabled: this.options.circle,
                handler: new L.Draw.Circle(map, this.options.circle),
                title: L.drawLocal.draw.toolbar.buttons.circle
            },
            {
                enabled: this.options.marker,
                handler: new L.Draw.Marker(map, this.options.marker),
                title: L.drawLocal.draw.toolbar.buttons.marker
            },
            {
                enabled: this.options.circlemarker,
                handler: new L.Draw.CircleMarker(map, this.options.circlemarker),
                title: L.drawLocal.draw.toolbar.buttons.circlemarker
            },
            {
                enabled: this.options.ellipse,
                handler: new L.Draw.Ellipse(map, this.options.ellipse),
                title: L.drawLocal.draw.toolbar.buttons.ellipse
            }
        ];
    }
});

L.DrawToolbar.addInitHook(function(){
    L.Util.setOptions(this, {ellipse:{}})
});

L.Draw = L.Draw || {};
L.Draw.Ellipse =L.Draw.SimpleShape.extend({
    statics: {
        TYPE: 'ellipse'
    },
    options: {
        shapeOptions: {
            stroke: true,
            color: '#3388ff',
            weight: 4,
            opacity: 0.5,
            fill: true,
            fillColor: null, //same as color by default
            fillOpacity: 0.2,
            clickable: true
        },
        showRadius: true,
        metric: true, // Whether to use the metric measurement system or imperial
        feet: true, // When not metric, use feet instead of yards for display
        nautic: false // When not metric, not feet use nautic mile for display
    },

    initialize: function (map, options) {
        this.type = L.Draw.Ellipse.TYPE;
        this._initialLabelText = L.drawLocal.draw.handlers.ellipse.tooltip.start;
        L.Draw.SimpleShape.prototype.initialize.call(this, map, options);
    },

    _drawShape: function (latlng) {
        if (L.GeometryUtil.isVersion07x()) {
            mRadiusY = latlng.distanceTo(L.latLng(this._startLatLng.lat, latlng.lng));
            mRadiusX = latlng.distanceTo(L.latLng(latlng.lat, this._startLatLng.lng));
        } else {
            mRadiusY = this._map.distance(latlng, L.latLng(this._startLatLng.lat, latlng.lng));
            mRadiusX = this._map.distance(latlng, L.latLng(latlng.lat, this._startLatLng.lng));
        }

        if (!this._shape) {
            this._shape = new L.Ellipse(this._startLatLng, [mRadiusX, mRadiusY], 0, this.options.shapeOptions);
            this._map.addLayer(this._shape);
        } else {
            this._shape.setRadius([mRadiusX, mRadiusY]);
        }
    },

    _fireCreatedEvent: function () {
        var ellipse = new L.Ellipse(this._startLatLng, this._shape.getRadius(), 0, this.options.shapeOptions);
        L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, ellipse);
    }
});

L.Edit = L.Edit || {};
L.Edit.Ellipse = L.Edit.SimpleShape.extend({
    // 创建中心点marker用于移动图形
    _createMoveMarker: function () {
        var center = this._shape.getLatLng();

        this._moveMarker = this._createMarker(center, this.options.moveIcon);	// 创建移动marker
    },
    // 创建边界marker用于改变图形形状
    _createResizeMarker: function () {
        var corners = this._getCorners();
        this._resizeMarkers = [];
        for (var i = 0, l = corners.length; i < l; i++) {
            this._resizeMarkers.push(this._createMarker(corners[i], this.options.resizeIcon));
            this._resizeMarkers[i]._cornerIndex = i;
        }
    },

    // 获取resize 的marker的坐标
    _getResizeMarkerPoint: function (latlng) {
        // From L.shape.getBounds()
        var delta = this._shape._radius * Math.cos(Math.PI / 4),
            point = this._map.project(latlng);
        return this._map.unproject([point.x + delta, point.y - delta]);
    },

    // 获取矩形的四个点
    _getCorners: function () {
        var bounds = this._shape.getBounds(),
            nw = bounds.getNorthWest(),
            ne = bounds.getNorthEast(),
            se = bounds.getSouthEast(),
            sw = bounds.getSouthWest();

        return [nw, ne, se, sw];
    },

    // 开始拖拽marker事件
    _onMarkerDragStart: function (e) {
        L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, e);
        var corners = this._getCorners(),
            marker = e.target,
            currentCornerIndex = marker._cornerIndex;
        // 获取所拖拽的marker相对的marker
        this._oppositeCorner = corners[(currentCornerIndex + 2) % 4];
        // 开始拖拽时将所有的resize marker不显示
        this._toggleCornerMarkers(0, currentCornerIndex);
    },

    // 拖拽marker结束
    _onMarkerDragEnd: function (e) {
        var marker = e.target,
            bounds, center;
        // 若拖拽的为中心移动marker，则设置该中心点最后的位置
        if (marker === this._moveMarker) {
            bounds = this._shape.getBounds();
            center = bounds.getCenter();
            marker.setLatLng(center);
        }
        // 显示所有的marker
        this._toggleCornerMarkers(1);
        // 设置所有marker的坐标
        this._repositionCornerMarkers();
        L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, e);
    },

    // 控制所有的marker的透明度
    _toggleCornerMarkers: function (opacity) {
        for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
            this._resizeMarkers[i].setOpacity(opacity);
        }
    },
    // 设置所有marker的坐标
    _repositionCornerMarkers: function () {
        var corners = this._getCorners();
        for (var i = 0, l = this._resizeMarkers.length; i < l; i++) {
            this._resizeMarkers[i].setLatLng(corners[i]);
        }
    },

    // 移动椭圆事件
    _move: function (newCenter) {
        this._shape.setLatLng(newCenter);   // 修改椭圆位置
        this._repositionCornerMarkers();    // 修改椭圆的marker的位置
        this._map.fire(L.Draw.Event.EDITMOVE, {layer: this._shape});
    },

    // resize椭圆事件
    _resize: function (latlng) {
        var moveLatLng = this._moveMarker.getLatLng();  // 获取中心点的经纬度
        // 获取并设置椭圆的长轴和短轴
        if (L.GeometryUtil.isVersion07x()) {
            var mRadiusY = latlng.distanceTo(L.latLng(moveLatLng.lat, latlng.lng));
            var mRadiusX = latlng.distanceTo(L.latLng(latlng.lat, moveLatLng.lng));
        } else {
            var mRadiusY = this._map.distance(latlng, L.latLng(moveLatLng.lat, latlng.lng));
            var mRadiusX = this._map.distance(latlng, L.latLng(latlng.lat, moveLatLng.lng));
        }
        this._shape.setRadius([mRadiusX, mRadiusY]);
        this._map.fire(L.Draw.Event.EDITRESIZE, {layer: this._shape});
    }
});

L.Ellipse.addInitHook(function(){
    if (L.Edit.Ellipse) {
        this.editing = new L.Edit.Ellipse(this);

        if (this.options.editable) {
            this.editing.enable();
        }
    }
});