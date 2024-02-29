import 'package:meditree/home/widget/gesture.dart';
import 'package:flutter/material.dart';

///
/// TikTok风格的一个视频页组件，覆盖在video上，提供以下功能：
/// 播放按钮的遮罩
/// 单击事件
/// 点赞事件回调（每次）
/// 长宽比控制
/// 底部padding（用于适配有沉浸式底部状态栏时）
///
class TikTokVideoPage extends StatelessWidget {
  final Widget? video;
  final double aspectRatio;
  final String? tag;
  final double bottomPadding;

  final Widget? rightButtonColumn;
  final Widget? userInfoWidget;

  final bool hidePauseIcon;

  final VoidCallback? onAddFavorite;
  final VoidCallback? onTap;

  const TikTokVideoPage({
    Key? key,
    this.bottomPadding = 16,
    this.tag,
    this.rightButtonColumn,
    this.userInfoWidget,
    this.onAddFavorite,
    this.onTap,
    this.video,
    this.aspectRatio = 9 / 16.0,
    this.hidePauseIcon = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // 右边的按钮列表
    Widget rightButtons = rightButtonColumn ?? Container();
    // 用户信息
    Widget userInfo = userInfoWidget ??
        VideoUserInfo(
          bottomPadding: bottomPadding,
        );
    // 视频加载的动画
    // Widget videoLoading = VideoLoadingPlaceHolder(tag: tag);
    // 视频播放页
    Widget videoContainer = Stack(
      children: <Widget>[
        Container(
          height: double.infinity,
          width: double.infinity,
          color: Colors.black,
          alignment: Alignment.center,
          child: Container(
            child: AspectRatio(
              aspectRatio: aspectRatio,
              child: video,
            ),
          ),
        ),
        TikTokVideoGesture(
          onAddFavorite: onAddFavorite,
          onSingleTap: onTap,
          child: Container(
            color: Colors.transparent,
            height: double.infinity,
            width: double.infinity,
          ),
        ),
        hidePauseIcon
            ? Container()
            : Container(
                height: double.infinity,
                width: double.infinity,
                alignment: Alignment.center,
                child: Icon(
                  Icons.play_circle_outline,
                  size: 120,
                  color: Colors.white.withOpacity(0.4),
                ),
              ),
      ],
    );
    Widget body = Container(
      child: Stack(
        children: <Widget>[
          videoContainer,
          Container(
            height: double.infinity,
            width: double.infinity,
            alignment: Alignment.bottomRight,
            child: rightButtons,
          ),
          Container(
            height: double.infinity,
            width: double.infinity,
            alignment: Alignment.bottomLeft,
            child: userInfo,
          ),
        ],
      ),
    );
    return body;
  }
}

class VideoLoadingPlaceHolder extends StatelessWidget {
  const VideoLoadingPlaceHolder({
    Key? key,
    required this.tag,
  }) : super(key: key);

  final String tag;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          colors: <Color>[
            Colors.blue,
            Colors.green,
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          CircularProgressIndicator(),
          Container(
            padding: EdgeInsets.all(50),
            child: Text(
              tag,
            ),
          ),
        ],
      ),
    );
  }
}

class VideoUserInfo extends StatelessWidget {
  final String? desc;

  // final Function onGoodGift;
  const VideoUserInfo({
    Key? key,
    required this.bottomPadding,
    // @required this.onGoodGift,
    this.desc,
  }) : super(key: key);

  final double bottomPadding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 12,
        bottom: bottomPadding,
      ),
      margin: EdgeInsets.only(right: 80),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '@朱二旦的枯燥生活',
          ),
          Container(height: 6),
          Text(
            desc ?? '#原创 有钱人的生活就是这么朴实无华，且枯燥 #短视频',
          ),
          Container(height: 6),
          Row(
            children: <Widget>[
              Icon(Icons.music_note, size: 14),
              Expanded(
                child: Text(
                  '朱二旦的枯燥生活创作的原声',
                  maxLines: 9,
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}