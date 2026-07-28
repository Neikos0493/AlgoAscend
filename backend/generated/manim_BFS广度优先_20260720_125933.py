from manim import *

class BFSViz(Scene):
    N = 4  # 网格边长 (4x4 = 16 节点)
    CELL_SIZE = 0.8
    GAP = 1.2
    # 颜色状态
    UNVISITED = DARK_GRAY
    IN_QUEUE = YELLOW
    CURRENT = BLUE
    VISITED = GREEN

    def construct(self):
        # ---------- 创建网格 ----------
        nodes = VGroup()
        labels = VGroup()
        for row in range(self.N):
            for col in range(self.N):
                idx = row * self.N + col
                # 单元格矩形
                cell = Square(
                    side_length=self.CELL_SIZE,
                    fill_color=self.UNVISITED,
                    fill_opacity=0.6,
                    stroke_color=GRAY,
                    stroke_width=2
                )
                # 居中定位
                x = (col - (self.N - 1) / 2) * self.GAP
                y = ((self.N - 1) / 2 - row) * self.GAP
                cell.move_to(np.array([x, y, 0]))
                # 编号
                num = Text(str(idx), font_size=24, color=WHITE)
                num.move_to(cell.get_center())
                nodes.add(cell)
                labels.add(num)
        # 加上边框
        grid_group = VGroup(nodes, labels)
        self.add(grid_group)

        # ---------- 标题 ----------
        title = Text("BFS (Breadth-First Search)", font_size=36, color=WHITE)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        self.wait(0.2)

        # ---------- 队列显示器 ----------
        queue_label = Text("Queue:", font_size=28, color=LIGHT_GRAY)
        queue_label.next_to(grid_group, DOWN, buff=0.8)
        queue_text = Text("[]", font_size=28, color=YELLOW)
        queue_text.next_to(queue_label, RIGHT, buff=0.3)
        display_group = VGroup(queue_label, queue_text)
        self.play(FadeIn(display_group, shift=UP))
        self.wait(0.2)

        # ---------- BFS 算法演示 ----------
        # 预计算 BFS 顺序（0 - 15）
        start = 0
        queue_list = [start]
        visited = set()
        bfs_order = []          # 记录 (当前节点, 新加入队列的邻居列表)

        temp_queue = [start]
        visited.add(start)
        while temp_queue:
            cur = temp_queue.pop(0)
            neighbors = []
            row, col = divmod(cur, self.N)
            # 四个方向：上、下、左、右
            for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
                nr, nc = row + dr, col + dc
                if 0 <= nr < self.N and 0 <= nc < self.N:
                    n_idx = nr * self.N + nc
                    if n_idx not in visited:
                        visited.add(n_idx)
                        neighbors.append(n_idx)
                        temp_queue.append(n_idx)
            bfs_order.append((cur, neighbors))

        # 重置 visited 用于动画
        visited.clear()
        queue_list = [start]

        def get_cell(index):
            """根据索引返回对应的 Square 对象"""
            return nodes[index]

        def set_cell_color(index, color):
            self.play(
                get_cell(index).animate.set_fill(color, opacity=0.9),
                run_time=0.15
            )

        # 初始：起点入队（黄色）
        set_cell_color(start, self.IN_QUEUE)
        self._update_queue_display(queue_list, queue_text)
        self.wait(0.3)

        # BFS 迭代
        step_index = 0
        for cur, new_neighbors in bfs_order:
            # 1. 当前节点从黄色变为蓝色（正在访问）
            set_cell_color(cur, self.CURRENT)
            self.wait(0.2)

            # 2. 当前节点从蓝色变为绿色（已访问），并从队列移除
            set_cell_color(cur, self.VISITED)
            queue_list.pop(0)   # 移除队首
            self._update_queue_display(queue_list, queue_text)

            # 3. 新邻居入队（黄色）
            for nb in new_neighbors:
                set_cell_color(nb, self.IN_QUEUE)
                queue_list.append(nb)
                self._update_queue_display(queue_list, queue_text)

            self.wait(0.3)

        # ---------- 结束 ----------
        self.wait(2)

    def _update_queue_display(self, queue_list, queue_text_mob):
        """更新队列文本显示"""
        new_text = "[" + ", ".join(str(x) for x in queue_list) + "]"
        new_mob = Text(new_text, font_size=28, color=YELLOW)
        new_mob.move_to(queue_text_mob.get_center())
        self.play(
            Transform(queue_text_mob, new_mob),
            run_time=0.1
        )