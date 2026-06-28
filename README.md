# FSMGEN 使用教程

FSMGEN 是一个纯前端状态机生成工具。你可以用表单或 YAML 描述有限状态机，然后生成：

- SystemVerilog FSM
- Verilog-2001 FSM
- Mermaid 状态图
- 状态转移表
- Testbench skeleton

## 1. 打开工具

推荐直接使用 GitHub Pages 线上版本：

```text
https://kanchainn-cmd.github.io/FSMGEN/
```

线上版本托管在 GitHub Pages，不占用本机资源。`main` 分支更新后会自动重新构建并发布。

如果需要离线使用，可以在本地使用静态文件模式，不需要启动本地端口服务：

```bash
cd /Users/kanchain/Desktop/Claude_zone/code/FSMGEN
npm run open:static
```

这个命令会执行构建，并打开：

```text
dist/index.html
```

如果已经构建过，也可以手动打开：

```bash
open dist/index.html
```

开发调试时才需要启动本地服务：

```bash
npm run dev -- --port 5173
```

## 2. 页面区域

页面主要分为几块：

- **Model**：表单编辑区，用来配置模块、端口、状态、转移和输出。
- **YAML**：源码编辑区，和表单双向同步。
- **Diagnostics**：错误和警告信息。
- **Preview**：生成结果预览。默认显示源码；Mermaid 状态图和 Markdown 转移表支持切换到 **Render** 渲染视图。
- **Export**：下载单个文件或 ZIP 包。

## 3. 基本使用流程

1. 在 **Module settings** 填写模块名、时钟、复位和 HDL 风格。
2. 在 **Ports** 添加输入和输出端口。
3. 在 **States** 添加状态，并填写 Moore 输出。
4. 在 **Transitions** 添加状态转移和条件。
5. 如果需要 Mealy 输出，勾选 **Mealy machine**，然后在转移上配置输出。
6. 查看 **YAML** 是否符合预期。
7. 在 **Preview** 切换查看 Verilog、Mermaid、表格和 testbench；对 Mermaid 状态图或 Markdown 表格，可以点击 **Render** 查看渲染结果。
8. 在 **Export** 下载生成文件。

## 4. YAML 字段说明

最小结构如下：

```yaml
version: 1
module: my_fsm
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs: []
  outputs: []
states: []
transitions: []
initial: IDLE
```

关键字段：

- `module`：生成的 Verilog 模块名。
- `flavor`：`systemverilog` 或 `verilog2001`。
- `mealy`：是否启用 Mealy 转移输出。
- `clock.name`：时钟信号名。
- `clock.reset`：复位信号名。
- `clock.reset_active`：`low` 或 `high`。
- `ports.inputs`：输入端口列表。
- `ports.outputs`：输出端口列表。
- `states`：状态列表。
- `states[].outputs`：Moore 输出，只依赖当前状态。
- `transitions`：状态转移列表。
- `transitions[].outputs`：Mealy 输出，只在 `mealy: true` 时允许。
- `initial`：初始状态。

## 5. 条件写法

### 5.1 表达式条件

适合复杂或手写 Verilog 条件：

```yaml
when:
  expr: start && ready
```

### 5.2 原子条件

适合表单结构化编辑：

```yaml
when:
  signal: start
  op: ==
  value: 1
```

支持的 `op`：

```text
== != < <= > >=
```

### 5.3 all / any 条件组

`all` 表示与，`any` 表示或：

```yaml
when:
  all:
    - signal: start
      op: ==
      value: 1
    - any:
        - signal: mode
          op: ==
          value: 2'b01
        - signal: force
          op: ==
          value: 1
```

会渲染为类似：

```verilog
(start == 1) && ((mode == 2'b01) || (force == 1))
```

## 6. Moore 示例

### 6.1 Moore 交通灯

这个例子中，输出只由当前状态决定。

```yaml
version: 1
module: traffic_light
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: timer_done
      width: 1
  outputs:
    - name: red
      width: 1
    - name: yellow
      width: 1
    - name: green
      width: 1
states:
  - name: RED
    outputs:
      red: 1
      yellow: 0
      green: 0
  - name: GREEN
    outputs:
      red: 0
      yellow: 0
      green: 1
  - name: YELLOW
    outputs:
      red: 0
      yellow: 1
      green: 0
transitions:
  - from: RED
    to: GREEN
    when:
      expr: timer_done
  - from: GREEN
    to: YELLOW
    when:
      expr: timer_done
  - from: YELLOW
    to: RED
    when:
      expr: timer_done
initial: RED
```

### 6.2 Moore 启停控制器

`busy` 和 `done` 都是状态输出。

```yaml
version: 1
module: start_done_controller
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: start
      width: 1
    - name: complete
      width: 1
    - name: ack
      width: 1
  outputs:
    - name: busy
      width: 1
    - name: done
      width: 1
states:
  - name: IDLE
    outputs:
      busy: 0
      done: 0
  - name: BUSY
    outputs:
      busy: 1
      done: 0
  - name: DONE
    outputs:
      busy: 0
      done: 1
transitions:
  - from: IDLE
    to: BUSY
    when:
      signal: start
      op: ==
      value: 1
  - from: BUSY
    to: DONE
    when:
      signal: complete
      op: ==
      value: 1
  - from: DONE
    to: IDLE
    when:
      signal: ack
      op: ==
      value: 1
initial: IDLE
```

### 6.3 Moore 带回退转移的控制器

用显式回退转移表达“条件不满足时保持当前状态”。

```yaml
version: 1
module: fallback_controller
flavor: systemverilog
mealy: false
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: start
      width: 1
    - name: complete
      width: 1
    - name: ack
      width: 1
  outputs:
    - name: busy
      width: 1
    - name: done
      width: 1
states:
  - name: IDLE
    outputs:
      busy: 0
      done: 0
  - name: BUSY
    outputs:
      busy: 1
      done: 0
  - name: DONE
    outputs:
      busy: 0
      done: 1
transitions:
  - from: IDLE
    to: BUSY
    when:
      signal: start
      op: ==
      value: 1
  - from: IDLE
    to: IDLE
    when:
      expr: "!start"
  - from: BUSY
    to: DONE
    when:
      signal: complete
      op: ==
      value: 1
  - from: BUSY
    to: BUSY
    when:
      expr: "!complete"
  - from: DONE
    to: IDLE
    when:
      signal: ack
      op: ==
      value: 1
  - from: DONE
    to: DONE
    when:
      expr: "!ack"
initial: IDLE
```

## 7. Mealy 示例

### 7.1 Mealy 序列检测器

检测到目标输入时，`detected` 在转移上输出。

```yaml
version: 1
module: sequence_detector
flavor: systemverilog
mealy: true
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: bit_in
      width: 1
  outputs:
    - name: detected
      width: 1
states:
  - name: S0
    outputs:
      detected: 0
  - name: S1
    outputs:
      detected: 0
transitions:
  - from: S0
    to: S1
    when:
      signal: bit_in
      op: ==
      value: 1
  - from: S1
    to: S0
    when:
      signal: bit_in
      op: ==
      value: 1
    outputs:
      detected: 1
  - from: S1
    to: S1
    when:
      signal: bit_in
      op: ==
      value: 0
initial: S0
```

### 7.2 Mealy 握手控制器

当 `ready` 在 `WAIT_READY` 状态拉高时，转移到 `DONE`，同时产生一拍 `valid`。

```yaml
version: 1
module: handshake_fsm
flavor: systemverilog
mealy: true
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: start
      width: 1
    - name: ready
      width: 1
    - name: ack
      width: 1
  outputs:
    - name: request
      width: 1
    - name: valid
      width: 1
states:
  - name: IDLE
    outputs:
      request: 0
      valid: 0
  - name: WAIT_READY
    outputs:
      request: 1
      valid: 0
  - name: DONE
    outputs:
      request: 0
      valid: 0
transitions:
  - from: IDLE
    to: WAIT_READY
    when:
      signal: start
      op: ==
      value: 1
  - from: WAIT_READY
    to: DONE
    when:
      signal: ready
      op: ==
      value: 1
    outputs:
      valid: 1
  - from: WAIT_READY
    to: WAIT_READY
    when:
      signal: ready
      op: ==
      value: 0
  - from: DONE
    to: IDLE
    when:
      signal: ack
      op: ==
      value: 1
initial: IDLE
```

### 7.3 Mealy 带组合条件的命令解析器

使用 `all` / `any` 组合条件。

```yaml
version: 1
module: command_parser
flavor: systemverilog
mealy: true
clock:
  name: clk
  reset: rst_n
  reset_active: low
ports:
  inputs:
    - name: valid_in
      width: 1
    - name: opcode
      width: 2
    - name: force
      width: 1
  outputs:
    - name: accept
      width: 1
    - name: error
      width: 1
states:
  - name: IDLE
    outputs:
      accept: 0
      error: 0
  - name: ACCEPTED
    outputs:
      accept: 0
      error: 0
  - name: ERROR
    outputs:
      accept: 0
      error: 1
transitions:
  - from: IDLE
    to: ACCEPTED
    when:
      all:
        - signal: valid_in
          op: ==
          value: 1
        - any:
            - signal: opcode
              op: ==
              value: 2'b01
            - signal: force
              op: ==
              value: 1
    outputs:
      accept: 1
  - from: IDLE
    to: ERROR
    when:
      all:
        - signal: valid_in
          op: ==
          value: 1
        - signal: opcode
          op: ==
          value: 2'b11
    outputs:
      error: 1
  - from: ACCEPTED
    to: IDLE
    when:
      expr: "1'b1"
  - from: ERROR
    to: IDLE
    when:
      expr: "1'b1"
initial: IDLE
```

## 8. 常见问题

### 8.1 为什么 YAML 写错后预览还没变？

这是刻意设计。YAML 解析失败时，工具会保留上一份有效模型，避免错误输入破坏预览和导出结果。

### 8.2 为什么 Mealy 输出被禁止？

只有 `mealy: true` 时，`transitions[].outputs` 才合法。否则这些输出会被诊断为错误。

### 8.3 端口宽度有什么限制？

输入和输出端口的 `width` 必须是大于等于 1 的整数。

### 8.4 什么时候用 Moore，什么时候用 Mealy？

Moore：

- 输出只依赖当前状态。
- 更稳定、直观，默认推荐。

Mealy：

- 输出依赖当前状态和输入条件。
- 适合一拍脉冲、握手响应、检测器等场景。

## 9. 验证命令

开发或修改后可以运行：

```bash
npm test
npm run build
npm run lint
```

静态打开：

```bash
npm run open:static
```
