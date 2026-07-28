```python
from manim import *
import random

class BubbleSortViz(Scene):
    def construct(self):
        # 设置暗色背景（可选，Manim默认即为黑色）
        self.camera.background_color = "#1a1a1a"
        
        # 参数
        N = 16
        data = [random.randint(5, 95) for _ in range(N)]
        n = len(data)
        max_val = max(data)

        # 创建柱状图
        bars = VGroup()
        labels = VGroup()
        spacing = 0.45
        bar_width = 0.35
        scale_factor = 5.0 / max_val  # 使得最高柱高度为5

        for i, v in enumerate(data):
            height = v * scale_factor
            bar = Rectangle(
                width=bar_width,
                height=height,
                fill_color=BLUE,
                fill_opacity=0.85,
                stroke_color=WHITE,
                stroke_width=0.5
            )
            x = (i - n/2) * spacing
            y = -2 + height/2
            bar.move_to(np.array([x, y, 0]))
            bars.add(bar)

            label = Text(str(v), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.15)
            labels.add(label)

        # 标题
        title = Text("冒泡排序", font_size=40, color=WHITE).to_edge(UP)
        
        # 显示初始状态
        self.play(
            Write(title),
            *[Create(bar) for bar in bars],
            *[Write(label) for label in labels],
            run_time=1.5
        )
        self.wait(0.5)

        # 冒泡排序主循环
        for i in range(n-1, 0, -1):
            #