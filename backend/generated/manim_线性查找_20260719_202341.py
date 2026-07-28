from manim import *
import random

class LinearSearchViz(Scene):
    def construct(self):
        # 参数设置
        N = 16
        data = [random.randint(5, 95) for _ in range(N)]
        target = data[7]  # 选择数组中第8个元素作为查找目标，确保成功
        max_val = max(data)
        bar_scale = 5.0

        # 创建柱状图
        bars = VGroup()
        labels = VGroup()
        for i, v in enumerate(data):
            bar = Rectangle(
                width=0.35,
                height=v / max_val * bar_scale,
                fill_color=BLUE,
                fill_opacity=0.8,
                stroke_color=WHITE,
                stroke_width=0.5,
            )
            bar.move_to(np.array([(i - N / 2) * 0.45, -2 + bar.height / 2, 0]))
            bars.add(bar)
            label = Text(str(v), font_size=14, color=WHITE)
            label.next_to(bar, DOWN, buff=0.15)
            labels.add(label)

        # 标题
        title = Text("Linear Search", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # 目标值显示
        target_text = Text(f"Target: {target}", font_size=24, color=YELLOW).to_corner(DR)
        self.play(FadeIn(target_text))

        # 添加柱状图和标签
        self.play(Create(bars), Write(labels), run_time=0.5)
        self.wait(0.3)

        # 线性查找动画
        found = False
        for i, (bar, label) in enumerate(zip(bars, labels)):
            # 高亮当前元素为黄色
            self.play(
                bar.animate.set_fill_color(YELLOW),
                label.animate.set_color(YELLOW),
                run_time=0.15,
            )
            self.wait(0.1)

            # 检查是否为目标
            if data[i] == target:
                # 找到：变为绿色，停止
                self.play(
                    bar.animate.set_fill_color(GREEN),
                    label.animate.set_color(GREEN),
                )
                found = True
                # 显示“Found!”文本
                found_text = Text("Found!", font_size=28, color=GREEN).next_to(title, DOWN)
                self.play(Write(found_text))
                self.wait(1)
                break
            else:
                # 未找到：恢复蓝色，短暂等待后继续
                self.play(
                    bar.animate.set_fill_color(BLUE),
                    label.animate.set_color(WHITE),
                    run_time=0.15,
                )
                self.wait(0.05)

        if not found:
            # 如果未找到（示例中不会进入，但保留逻辑）
            not_found_text = Text("Not Found", font_size=28, color=RED).next_to(title, DOWN)
            self.play(Write(not_found_text))
            self.wait(1)

        self.wait(2)