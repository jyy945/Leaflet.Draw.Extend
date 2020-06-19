/**
 * @Desc Edit.Ellipse
 * @Auther: jyy
 * @Date: 2020/6/19 10:11
 * @Version: 1.0
 * @Last Modified by: jyy
 * @Last Modified time: 2020/6/19 10:11
 */
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
        let mRadiusX,mRadiusY;
        if (L.GeometryUtil.isVersion07x()) {
            mRadiusY = latlng.distanceTo(L.latLng(moveLatLng.lat, latlng.lng));
            mRadiusX = latlng.distanceTo(L.latLng(latlng.lat, moveLatLng.lng));
        } else {
            mRadiusY = this._map.distance(latlng, L.latLng(moveLatLng.lat, latlng.lng));
            mRadiusX = this._map.distance(latlng, L.latLng(latlng.lat, moveLatLng.lng));
        }
        this._shape.setRadius([mRadiusX, mRadiusY]);
        console.log(mRadiusY);
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
