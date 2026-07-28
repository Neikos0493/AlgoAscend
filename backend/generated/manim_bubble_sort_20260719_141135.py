# 冒泡排序可视化 — Manim 脚本
from manim import *
import random

class BubbleSort(Scene):
    def construct(self):
        # 生成随机数据
        data = [random.randint(5, 95) for _ in range(16)]
        n = len(data)
        bar_width = 0.35
        max_val = max(data)

        # 创建柱状图
        bars = VGroup()
        labels = VGroup()
        for i, v in enumerate(data):
            bar = Rectangle(
                width=bar_width,
                height=v / max_val * 5,
                fill_color=BLUE,
                fill_opacity=0.8,
                stroke_color=WHITE,
                stroke_width=0.5,
            )
            bar.move_to(np.array([(i - n/2) * (bar_width + 0.1), -2 + bar.height/2, 0]))
            bar.set_z_index(1)
            bars.add(bar)

            label = Text(str(v), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.1)
            labels.add(label)

        self.add(bars, labels)
        self.wait(0.5)

        # 冒泡排序动画
        for i in range(n):
            for j in range(n - i - 1):
                # 高亮比较的两个条
                self.play(
                    bars[j].animate.set_fill(YELLOW),
                    bars[j+1].animate.set_fill(YELLOW),
                    run_time=0.15,
                )
                if data[j] > data[j+1]:
                    # 交换动画
                    self.play(
                        bars[j].animate.move_to(bars[j+1].get_center()),
                        bars[j+1].animate.move_to(bars[j].get_center()),
                        labels[j].animate.move_to(labels[j+1].get_center()),
                        labels[j+1].animate.move_to(labels[j].get_center()),
                        run_time=0.3,
                    )
                    data[j], data[j+1] = data[j+1], data[j]
                    bars[j], bars[j+1] = bars[j+1], bars[j]
                    labels[j], labels[j+1] = labels[j+1], labels[j]
                # 恢复颜色
                self.play(bars[j].animate.set_fill(BLUE), bars[j+1].animate.set_fill(BLUE), run_time=0.1)
            # 标记已排序
            self.play(bars[n-i-1].animate.set_fill(GREEN), run_time=0.2)

        self.wait(1)
