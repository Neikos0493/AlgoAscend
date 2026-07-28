```python
from manim import *
import random

class BubbleSortViz(Scene):
    def construct(self):
        # 参数设置
        n = 16
        data = [random.randint(10, 100) for _ in range(n)]
        max_val = max(data)
        spacing = 0.65
        bar_width = 0.45
        max_height = 5.0
        base_y = -2.5

        # 创建柱状图与标签
        elements = VGroup()
        for i, val in enumerate(data):
            x = (i - (n - 1) / 2) * spacing
            height = val / max_val * max_height
            y = base_y + height / 2
            bar = Rectangle(
                width=bar_width,
                height=height,
                fill_color=BLUE,
                fill_opacity=0.85,
                stroke_color=WHITE,
                stroke_width=0.5
            )
            bar.move_to(np.array([x, y, 0]))
            label = Text(str(val), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.1)
            group = VGroup(bar, label)
            elements.add(group)

        self.add(elements)

        # 标题
        title = Text("Bubble Sort", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # 冒泡排序动画