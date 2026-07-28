```python
from manim import *
import random

class BubbleSort(Scene):
    def construct(self):
        n = 16
        # 生成随机数据
        data = [random.randint(1, 99) for _ in range(n)]
        max_val = max(data)
        
        # 布局参数
        bar_max_height = 4.0
        base_y = -2.0
        spacing = 0.6
        
        # 创建柱子和标签
        bars = VGroup()
        labels = VGroup()
        
        for i, val in enumerate(data):
            height = val / max_val * bar_max_height
            bar = Rectangle(
                width=0.3, height=height,
                fill_color=BLUE, fill_opacity=0.8,
                stroke_color=WHITE, stroke_width=0.5
            )
            x = (i - n/2) * spacing
            bar.move_to(np.array([x, base_y + height/2, 0]))
            bars.add(bar)
            
            label = Text(str(val), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.1)
            labels.add(label)
        
        # 添加场景元素
        self.add(bars, labels)
        title = Text("Bubble Sort (冒泡排序)", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)
        
        # 冒泡排序动画
        for i in range(n-1, 0, -1):
            # 内层循环
            for j in range(i):
                # 高亮比较的两个柱子为黄色
                self.play(
                    bars[j].animate.set_fill(YELLOW, 0.8),
                    bars[j+1].animate.set_fill(YELLOW, 0.8),
                    run_time=0.15
                )
                self.wait(0.05)
                
                if data[j] > data[j+1]:
                    # 交换数据
                    data[j], data[j+1] = data[j+1], data[j]
                    # 交换 bars 和 labels 在 VGroup 中的顺序
                    bars[j], bars[j+1] = bars[j+1], bars[j]
                    labels[j], labels[j+1] = labels[j+1], labels[j]
                    
                    # 计算交换后的目标位置
                    x_j = (j - n/2) * spacing
                    x_j1 = ((j+1) - n/2) * spacing
                    
                    # 动画：移动柱子和标签
                    self.play(
                        bars[j].animate.move_to(np.array([x_j, base_y + bars[j].height/2, 0])),
                        bars[j+1].animate.move_to(np.array([x_j1, base_y + bars[j+1].height/2, 0])),
                        run_time=0.25
                    )
                    self.play(
                        labels[j].animate.next_to(bars[j], DOWN, buff=0.1),
                        labels[j+1].animate.next_to(bars[j+1], DOWN, buff=0.1),
                        run_time=0.25
                    )
                    # 交换后标记为红色
                    self.play(
                        bars[j].animate.set_fill(RED, 0.8),
                        bars[j+1].animate.set_fill(RED, 0.8),
                        run_time=0.1
                    )
                else:
                    # 不需要交换，直接恢复蓝色
                    self.play(
                        bars[j].animate.set_fill(BLUE, 0.8),
                        bars[j+1].animate.set_fill(BLUE, 0.8),
                        run_time=0.1
                    )
            # 一轮结束后，重置所有柱子颜色（已排序部分