# 归并排序可视化 — Manim 脚本
from manim import *
import random

class MergeSort(Scene):
    def construct(self):
        data = [random.randint(5, 95) for _ in range(16)]
        n = len(data)
        bar_width = 0.35
        max_val = max(data)

        bars = VGroup()
        labels = VGroup()
        for i, v in enumerate(data):
            bar = Rectangle(
                width=bar_width, height=v / max_val * 5,
                fill_color=BLUE, fill_opacity=0.8,
                stroke_color=WHITE, stroke_width=0.5,
            )
            bar.move_to(np.array([(i - n/2) * (bar_width + 0.1), -2 + bar.height/2, 0]))
            bars.add(bar)
            label = Text(str(v), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.1)
            labels.add(label)

        self.add(bars, labels)
        self.wait(0.5)

        def merge(lo, mid, hi):
            self.play(*[bars[k].animate.set_fill(YELLOW) for k in range(lo, hi+1)], run_time=0.5)
            left = data[lo:mid+1]
            right = data[mid+1:hi+1]
            i = j = 0
            k = lo
            while i < len(left) and j < len(right):
                if left[i] <= right[j]:
                    data[k] = left[i]
                    self.play(
                        bars[k].animate.set_fill(ORANGE).animate.set_z_index(2),
                        run_time=0.15,
                    )
                    i += 1
                else:
                    data[k] = right[j]
                    self.play(
                        bars[k].animate.set_fill(PURPLE).animate.set_z_index(2),
                        run_time=0.15,
                    )
                    j += 1
                k += 1
            while i < len(left):
                data[k] = left[i]; i += 1; k += 1
            while j < len(right):
                data[k] = right[j]; j += 1; k += 1
            self.play(*[bars[k].animate.set_fill(GREEN) for k in range(lo, hi+1)], run_time=0.5)

        def ms(lo, hi):
            if lo < hi:
                mid = (lo + hi) // 2
                ms(lo, mid)
                ms(mid + 1, hi)
                merge(lo, mid, hi)

        ms(0, n - 1)
        self.wait(1)
