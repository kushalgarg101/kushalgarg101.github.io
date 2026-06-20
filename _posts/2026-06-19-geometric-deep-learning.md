---
layout: post
title: "Geometric Deep Learning: From Group Theory to Convolutional Networks"
date: 2026-06-19
summary: "A journey through symmetry, equivariance, and what that teaches us about building networks that respect rotation."
tags: [Geometric Deep Learning, Group Theory, CNN, Equivariance, PyTorch]
permalink: /blog/2026-06-19/geometric-deep-learning/
---
<section id="geometric-deep-learning-post">
    <p class="intro">
        I have always been bothered by a simple fact: show a neural network a cat upright, and it says "cat." Rotate that cat by 90 degrees, and it might say "car." A human would never make that mistake. This project explores <em>why</em> standard networks fail at rotation, and whether we can build architectures that handle it naturally using group theory.
    </p>

    <p class="intro">
        The short answer: yes, but it is much harder than it looks. My first attempt failed spectacularly, and understanding <em>why</em> it failed taught me more than getting it right would have.
    </p>

    <nav class="toc" aria-label="Table of Contents">
        <div class="toc-title">Contents</div>
        <ol class="toc-list">
            <li>
                <a href="#why-symmetry">1. Why Symmetry?</a>
            </li>
            <li>
                <a href="#groups">2. Groups and Group Actions</a>
                <ol>
                    <li><a href="#groups-what">2.1 What is a Group?</a></li>
                    <li><a href="#groups-rotation">2.2 The Rotation Group \(C_4\)</a></li>
                    <li><a href="#groups-actions">2.3 Group Actions</a></li>
                </ol>
            </li>
            <li>
                <a href="#orbits">3. Orbits</a>
            </li>
            <li>
                <a href="#invariance">4. Invariance</a>
                <ol>
                    <li><a href="#invariance-wrong">4.1 When Invariance is Wrong</a></li>
                </ol>
            </li>
            <li>
                <a href="#equivariance">5. Equivariance</a>
                <ol>
                    <li><a href="#equivariance-segmentation">5.1 Example: Segmentation</a></li>
                    <li><a href="#equivariance-comparison">5.2 Invariance vs Equivariance</a></li>
                </ol>
            </li>
            <li>
                <a href="#orbit-aggregation">6. Orbit Aggregation</a>
            </li>
            <li>
                <a href="#group-convolution">7. Group Convolution</a>
                <ol>
                    <li><a href="#gc-first-layer">7.1 First Layer: Scalar Field to Group Field</a></li>
                    <li><a href="#gc-second-layer">7.2 Second Layer: Group Field to Group Field</a></li>
                    <li><a href="#gc-equivariant">7.3 Why This is Equivariant</a></li>
                    <li><a href="#gc-haar">7.4 The Continuous Case (Haar Measure)</a></li>
                </ol>
            </li>
            <li>
                <a href="#building-group-conv">8. Building Group Convolution From Scratch</a>
                <ol>
                    <li><a href="#bgc-first-layer">8.1 First Layer: Scalar Field to Group Field</a></li>
                    <li><a href="#bgc-subsequent">8.2 Subsequent Layers: Group Field to Group Field</a></li>
                    <li><a href="#bgc-pooling">8.3 Group Pooling (for Invariance)</a></li>
                    <li><a href="#bgc-rotation">8.4 Kernel Rotation</a></li>
                </ol>
            </li>
            <li>
                <a href="#five-models">9. The Five Models</a>
                <ol>
                    <li><a href="#fm-framework">9.1 Mathematical Framework</a></li>
                    <li><a href="#fm-vanilla">9.2 Model 1: Vanilla CNN</a></li>
                    <li><a href="#fm-augmented">9.3 Model 2: Augmented CNN</a></li>
                    <li><a href="#fm-equiv">9.4 Model 3: Equiv-C4</a></li>
                    <li><a href="#fm-inv">9.5 Model 4: Inv-C4</a></li>
                    <li><a href="#fm-pool">9.6 Model 5: Vanilla+Pool</a></li>
                    <li><a href="#fm-comparison">9.7 Comparison Summary</a></li>
                </ol>
            </li>
            <li>
                <a href="#results">10. Results</a>
                <ol>
                    <li><a href="#results-accuracy">10.1 Accuracy at 0° vs 90°</a></li>
                    <li><a href="#results-angle">10.2 Full Angle Curve</a></li>
                </ol>
            </li>
            <li>
                <a href="#six-vs-nine">11. The 6 vs 9 Problem</a>
            </li>
            <li>
                <a href="#postmortem">12. Why our equivariant CNN failed to perform well?</a>
                <ol>
                    <li><a href="#pm-pooling">12.1 Failure 1: Max Pooling</a></li>
                    <li><a href="#pm-bn">12.2 Failure 2: Batch Normalization</a></li>
                    <li><a href="#pm-fc">12.3 Failure 3: FC Classifier</a></li>
                    <li><a href="#pm-data">12.4 Failure 4: Unrotated Data</a></li>
                    <li><a href="#pm-results">12.5 Results</a></li>
                </ol>
            </li>
            <li>
                <a href="#takeaways">13. Key Takeaways</a>
                <ol>
                    <li><a href="#takeaways-learned">13.1 What We Learned</a></li>
                    <li><a href="#takeaways-intuition">13.2 Correcting Our Intuition</a></li>
                </ol>
            </li>
        </ol>
    </nav>

    <h2 id="why-symmetry"><span class="header-num">1</span> Why Symmetry?</h2>

    <p>
        Consider a photograph of a cat. Now rotate that photograph by 90 degrees. Is it still a cat? Of course.
    </p>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/cat.png' | relative_url }}" alt="A cat is still a cat regardless of orientation">
        <figcaption>A cat is still a cat regardless of orientation.</figcaption>
    </figure>

    <p>
        A human recognizes the cat instantly, regardless of how it is oriented. But a standard neural network does not share this ability. Show it a cat upright and it says "cat." Show it the same cat rotated, and it might get it right, it might not.
    </p>

    <p>
        This is not a minor flaw. It is a fundamental limitation of how standard neural networks process visual information.
    </p>

    <p>
        The world is full of symmetries. Objects can be translated, rotated, scaled, and reflected without changing their identity. A network that does not understand these symmetries must learn each variation separately, requiring massive amounts of data. A network that <em>builds in</em> an understanding of symmetry can generalize from far fewer examples.
    </p>

    <p>
        This leads us to the central question of geometric deep learning:
    </p>

    <blockquote>
        <p>How do we build neural networks that respect transformations like rotation or translation?</p>
    </blockquote>

    <p>
        The answer lies in group theory.
    </p>

    <h2 id="groups"><span class="header-num">2</span> Groups and Group Actions</h2>

    <h3 id="groups-what"><span class="header-num">2.1</span> What is a Group?</h3>

    <p>
        A <strong>group</strong> is a set of transformations that can be composed. Formally, a group \(G\) is a set equipped with an operation \(\cdot\) (composition) satisfying four axioms:
    </p>

    <ol>
        <li><strong>Closure</strong>: For all \(a, b \in G\), \(a \cdot b \in G\)</li>
        <li><strong>Associativity</strong>: \((a \cdot b) \cdot c = a \cdot (b \cdot c)\)</li>
        <li><strong>Identity</strong>: There exists \(e \in G\) such that \(e \cdot a = a \cdot e = a\) for all \(a \in G\)</li>
        <li><strong>Inverse</strong>: For each \(a \in G\), there exists \(a^{-1} \in G\) such that \(a \cdot a^{-1} = a^{-1} \cdot a = e\)</li>
    </ol>

    <h3 id="groups-rotation"><span class="header-num">2.2</span> The Rotation Group \(C_4\)</h3>

    <p>
        The simplest group that matters for our experiments is \(C_4\), the cyclic group of order 4 (rotations by multiples of 90 degrees):
    </p>

    <div class="equation">
        \[
        C_4 = \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}
        \]
    </div>

    <p>
        Composition is just adding angles modulo 360 degrees. The identity is \(0^\circ\), and the inverse of \(90^\circ\) is \(270^\circ\).
    </p>

    <h3 id="groups-actions"><span class="header-num">2.3</span> Group Actions</h3>

    <p>
        A group is abstract. A <strong>group action</strong> is how the group actually transforms things. If \(x\) is an image, then \(g \cdot x\) means "apply transformation \(g\) to image \(x\)."
    </p>

    <p>
        For \(C_4\) acting on images:
    </p>

    <div class="equation">
        \[
        \begin{aligned}
        0^\circ \cdot x &= x \text{ (unchanged)} \\
        90^\circ \cdot x &= \text{image rotated 90° clockwise} \\
        180^\circ \cdot x &= \text{image rotated 180°} \\
        270^\circ \cdot x &= \text{image rotated 270° clockwise}
        \end{aligned}
        \]
    </div>

    <p>
        We have a set of transformations, and we know how to apply them to data.
    </p>

    <h2 id="orbits"><span class="header-num">3</span> Orbits</h2>

    <p>
        The <strong>orbit</strong> of an image \(x\) under a group \(G\) is the set of all transformed versions:
    </p>

    <div class="equation">
        \[
        \text{Orb}(x) = \{g \cdot x \mid g \in G\}
        \]
    </div>

    <p>
        For a cat under \(C_4\), the orbit looks like this:
    </p>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Group element</th>
                    <th>Transformation</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>\(0^\circ\)</td>
                    <td>Identity</td>
                    <td>Cat upright</td>
                </tr>
                <tr>
                    <td>\(90^\circ\)</td>
                    <td>Rotate 90°</td>
                    <td>Cat on its side</td>
                </tr>
                <tr>
                    <td>\(180^\circ\)</td>
                    <td>Rotate 180°</td>
                    <td>Cat upside down</td>
                </tr>
                <tr>
                    <td>\(270^\circ\)</td>
                    <td>Rotate 270°</td>
                    <td>Cat on the other side</td>
                </tr>
            </tbody>
        </table>
    </div>

    <p>
        These are four different arrays of pixels. To a computer, they look completely different. But to a human, they are all the same cat.
    </p>

    <p>
        The orbit captures the essential idea: <strong>the orbit contains all the ways the same underlying object can appear under different transformations.</strong>
    </p>

    <p>
        If we can build a network that treats all elements of an orbit the same way (invariance) or that transforms predictably across the orbit (equivariance), we have built in an understanding of symmetry.
    </p>

    <h2 id="invariance"><span class="header-num">4</span> Invariance</h2>

    <p>
        A function \(f\) is <strong>invariant</strong> under a group \(G\) if:
    </p>

    <div class="equation">
        \[
        f(g \cdot x) = f(x) \quad \text{for all } g \in G
        \]
    </div>

    <p>
        The output does not change when the input is transformed. If you rotate a cat picture, the prediction "cat" stays the same.
    </p>

    <p>
        The <strong>Invariant CNN</strong> is designed to be invariant. After group convolution layers, it applies <strong>group pooling</strong>, averaging over all rotation channels, so the final prediction does not depend on which orientation the input was in.
    </p>

    <h3 id="invariance-wrong"><span class="header-num">4.1</span> When Invariance is Wrong</h3>

    <p>
        Here lies a crucial subtlety. Consider the digits 6 and 9:
    </p>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Digit</th>
                    <th>Rotated by 180°</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>6</strong></td>
                    <td>\(R_{180°}(6)\)</td>
                    <td><strong>9</strong></td>
                </tr>
                <tr>
                    <td><strong>9</strong></td>
                    <td>\(R_{180°}(9)\)</td>
                    <td><strong>6</strong></td>
                </tr>
            </tbody>
        </table>
    </div>

    <p>
        If our network is <em>fully invariant</em> to rotation, then it must predict the same class for 6 and 9, because they are rotations of each other. But 6 and 9 are <strong>different digits</strong>. Full rotation invariance is the wrong property here!
    </p>

    <p>
        This is not a flaw in the theory. It is a design choice. Some tasks want invariance (classifying "is there a cat in this picture?" regardless of orientation). Some tasks want equivariance (segmenting a tumor: if the patient is rotated, the mask should rotate too). And some tasks want partial invariance (classifying digits: invariant to small rotations but not 180° flips that change 6 into 9).
    </p>

    <p>
        The choice of symmetry is part of the network design, not something to be applied blindly.
    </p>

    <h2 id="equivariance"><span class="header-num">5</span> Equivariance</h2>

    <p>
        A function \(f\) is <strong>equivariant</strong> under a group \(G\) if:
    </p>

    <div class="equation">
        \[
        f(g \cdot x) = g \cdot f(x) \quad \text{for all } g \in G
        \]
    </div>

    <p>
        If the input transforms, the output transforms <strong>in the same way</strong>. Equivariance preserves structure rather than destroying it.
    </p>

    <h3 id="equivariance-segmentation"><span class="header-num">5.1</span> Example: Segmentation</h3>

    <p>
        Imagine a medical scan of a tumor. If we rotate the input scan by 90°, an equivariant network produces a segmentation mask that is <strong>also rotated by 90°</strong>:
    </p>

    <div class="equation">
        \[
        f(R_{90°} \cdot \text{scan}) = R_{90°} \cdot f(\text{scan})
        \]
    </div>

    <p>
        The mask rotates because the tumor rotated. The network is equivariant: it tracks where features are and how they move under transformations.
    </p>

    <h3 id="equivariance-comparison"><span class="header-num">5.2</span> Invariance vs Equivariance</h3>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Property</th>
                    <th>Meaning</th>
                    <th>When to Use</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Invariance</strong></td>
                    <td>Output unchanged by transformation</td>
                    <td>Classification (image-level decisions)</td>
                </tr>
                <tr>
                    <td><strong>Equivariance</strong></td>
                    <td>Output transforms same way as input</td>
                    <td>Segmentation, keypoint detection, any task needing spatial structure</td>
                </tr>
            </tbody>
        </table>
    </div>

    <p>
        A typical pipeline uses equivariant layers to process data, then an invariant "head" to make the final decision:
    </p>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/equi_architect.png' | relative_url }}" alt="Equivariant network architecture pipeline">
        <figcaption>A typical equivariant pipeline: equivariant layers preserve structure through the network, then an invariant head makes the final decision.</figcaption>
    </figure>

    <p>
        The equivariant layers preserve structure. The invariant head removes the transformation at the very end, but only after the network has had a chance to use the structure internally.
    </p>

    <h2 id="orbit-aggregation"><span class="header-num">6</span> Orbit Aggregation</h2>

    <p>
        The simplest way to build invariance is <strong>orbit aggregation</strong>:
    </p>

    <div class="equation">
        \[
        F(x) = \frac{1}{|G|} \sum_{g \in G} f(g \cdot x)
        \]
    </div>

    <p>
        Take each transformed version of the input, apply the same function \(f\), and average. If \(f\) is a feature extractor (like a conv layer), then \(F\) is invariant because the sum over the group commutes with the group action:
    </p>

    <div class="equation">
        \[
        F(h \cdot x) = \frac{1}{|G|} \sum_{g \in G} f(g \cdot h \cdot x) = \frac{1}{|G|} \sum_{g' \in G} f(g' \cdot x) = F(x)
        \]
    </div>

    <p>
        (The substitution \(g' = gh\) just reorders the sum, which doesn't change the result.)
    </p>

    <p>
        This is the simplest and most intuitive way to build invariance, and it works. But it has a limitation: it treats all transformations equally. If we want the network to <em>learn</em> which transformations matter (and which are just noise), we need something more powerful.
    </p>

    <h2 id="group-convolution"><span class="header-num">7</span> Group Convolution</h2>

    <p>
        <strong>Group convolution</strong> is the engine of equivariant networks. Unlike orbit aggregation (which averages over transformations), group convolution produces an output <strong>indexed by group elements</strong>. The output itself is a function on \(G\). This is what makes it equivariant.
    </p>

    <h3 id="gc-first-layer"><span class="header-num">7.1</span> First Layer: Scalar Field to Group Field</h3>

    <p>
        Let \(f: \mathbb{Z}^2 \to \mathbb{R}\) be an input image and \(\psi: \mathbb{Z}^2 \to \mathbb{R}\) be a convolution kernel. The first-layer group convolution produces a <strong>group field</strong>, a feature map indexed by \(g \in G\):
    </p>

    <div class="equation">
        \[
        [f \star \psi](g) = \sum_{y \in \mathbb{Z}^2} f(y) \cdot L_g[\psi](y)
        \]
    </div>

    <p>
        where \(L_g[\psi](y) = \psi(g^{-1}y)\) is the kernel \(\psi\) rotated by \(g\) degrees.
    </p>

    <p>
        Equivalently, in convolutional notation:
    </p>

    <div class="equation">
        \[
        [f \star \psi](g) = f * L_g[\psi]
        \]
    </div>

    <p>
        where \(*\) is standard 2D convolution. For each group element \(g\), we rotate the kernel by \(g\) and convolve with the input. The output is a stack of \(|G|\) feature maps, one per group element.
    </p>

    <p>
        <strong>Tensor shape</strong>: \((B, C_{in}, H, W) \to (B, C_{out}, G, H, W)\). A new group dimension appears.
    </p>

    <h3 id="gc-second-layer"><span class="header-num">7.2</span> Second Layer: Group Field to Group Field</h3>

    <p>
        Now \(f\) is a group field \(f: G \times \mathbb{Z}^2 \to \mathbb{R}\) and \(\psi: G \times \mathbb{Z}^2 \to \mathbb{R}\) is a kernel with its own group index. The convolution is:
    </p>

    <div class="equation">
        \[
        [f \star \psi](g) = \sum_{h \in G} \sum_{y \in \mathbb{Z}^2} f(h, y) \cdot L_h[\psi(g^{-1}h)](y)
        \]
    </div>

    <p>
        The key differences from the first layer:
    </p>

    <ul>
        <li>The sum is over <strong>both</strong> group elements \(h\) and spatial positions \(y\).</li>
        <li>The kernel \(\psi\) has an extra group dimension: for each pair \((g, h)\) we use \(\psi(g^{-1}h)\), the kernel at relative step \(g^{-1}h\).</li>
        <li>The kernel is rotated by the <strong>input</strong> element \(h\), not the output element \(g\).</li>
    </ul>

    <p>
        <strong>Tensor shape</strong>: \((B, C_{in}, G, H, W) \to (B, C_{out}, G, H, W)\). The group dimension is preserved.
    </p>

    <h3 id="gc-equivariant"><span class="header-num">7.3</span> Why This is Equivariant</h3>

    <p>
        The group convolution satisfies:
    </p>

    <div class="equation">
        \[
        L_h[f \star \psi] = [L_h f] \star \psi
        \]
    </div>

    <p>
        where \(L_h\) is the left-regular representation: \([L_h f](g, y) = f(h^{-1}g, \, h^{-1}y)\). Rotating the input by \(h\) shifts the output by \(h\) in the group dimension and rotates the spatial features correspondingly.
    </p>

    <h3 id="gc-haar"><span class="header-num">7.4</span> The Continuous Case (Haar Measure)</h3>

    <p>
        For continuous groups (like all rotations \(SO(2)\)), the sum becomes an integral:
    </p>

    <div class="equation">
        \[
        [f \star \psi](g) = \int_G \int_{\mathbb{R}^2} f(h, y) \cdot L_h[\psi(g^{-1}h)](y) \, dy \, dh
        \]
    </div>

    <p>
        where \(dh\) is the <strong>Haar measure</strong>, the unique way to integrate over a group that is invariant to how we parametrize it. For rotations, the Haar measure is uniform measure over angles: no angle is artificially favored.
    </p>

    <p>
        In our experiments, we work with the discrete group \(C_4\), so we use sums instead of integrals.
    </p>

    <h2 id="building-group-conv"><span class="header-num">8</span> Building Group Convolution From Scratch</h2>

    <p>
        Let us see exactly how group convolution is implemented.
    </p>

    <h3 id="bgc-first-layer"><span class="header-num">8.1</span> First Layer: Scalar Field to Group Field</h3>

    <pre><code class="language-python">class GroupConv2d(nn.Module):
    def forward(self, x):
        # x shape: [B, C_in, H, W] (scalar field, no group dimension)
        for g in range(G):
            w_rot = rotate_kernel(self.weight, g * 90°)
            output[:, :, g, :, :] = conv2d(x, w_rot)</code></pre>

    <p>
        For each group element \(g\), we rotate the kernel by \(g\) degrees and convolve. The output has a new dimension: the <strong>group dimension</strong>, indexed by \(g\).
    </p>

    <p>
        <strong>What the group dimension represents</strong>: Output channel \(c\) at group index \(g\) contains features extracted by the kernel rotated by \(g \cdot 90^\circ\). When the input rotates by \(90^\circ\), these features shift by one position in the group dimension.
    </p>

    <h3 id="bgc-subsequent"><span class="header-num">8.2</span> Subsequent Layers: Group Field to Group Field</h3>

    <pre><code class="language-python">class GroupToGroupConv2d(nn.Module):
    def forward(self, x):
        # x shape: [B, C_in, G, H, W] (group field)
        for g_out in range(G):
            sum = 0
            for g_in in range(G):
                rel_g = (g_in - g_out) % G       # ← g_in * g_out^{-1}
                w = rotate_kernel(self.weight[:, :, rel_g], g_in * 90°)
                sum += conv2d(x[:, :, g_in], w)
            output[:, :, g_out] = sum</code></pre>

    <p>
        The kernel has shape \([C_{out}, C_{in}, G, K, K]\), where the third dimension indexes the <strong>relative group step</strong> \(g_{in} - g_{out}\). For each pair \((g_{out}, g_{in})\), we rotate a base kernel by the <strong>input group element</strong> \(g_{in}\) and convolve the input at group \(g_{in}\). This is the weight-sharing constraint that enforces equivariance.
    </p>

    <p>
        <strong>Important</strong>: The relative index direction and rotation angle are subtle. The correct constraint comes from the group convolution formula \((f \star \psi)(g) = \sum_{h \in G} f(h) \cdot L_h[\psi(g^{-1}h)]\). The kernel \(\psi(g^{-1}h)\) is indexed by \(h - g\) (relative step from output to input), and the left-regular representation \(L_h\) rotates by the <strong>input element</strong> \(h\). Getting this wrong breaks equivariance entirely.
    </p>

    <h3 id="bgc-pooling"><span class="header-num">8.3</span> Group Pooling (for Invariance)</h3>

    <pre><code class="language-python">class GroupPooling(nn.Module):
    def forward(self, x):
        return x.mean(dim=2)  # average over group dimension</code></pre>

    <p>
        This collapses the group dimension, producing a scalar field. The result is invariant: it no longer depends on which orientation the input had. But as we will see, this invariance comes at a cost.
    </p>

    <h3 id="bgc-rotation"><span class="header-num">8.4</span> Kernel Rotation</h3>

    <pre><code class="language-python">def rotate_kernel(kernel, angle_deg):
    if angle_deg % 90 == 0:
        # Exact rotation via transpose + flip
        if k == 1: return kernel.transpose(2,3).flip(3)
        if k == 2: return kernel.flip(2).flip(3)
        if k == 3: return kernel.transpose(2,3).flip(2)
    else:
        # Bilinear interpolation for arbitrary angles
        theta = affine_matrix(angle_deg)
        grid = F.affine_grid(theta, ...)
        rotated = F.grid_sample(kernel, grid)</code></pre>

    <p>
        For 90-degree increments, we use exact pixel permutations (transpose and flip). For other angles, we use bilinear interpolation, which introduces discretization error.
    </p>

    <h2 id="five-models"><span class="header-num">9</span> The Five Models</h2>

    <p>
        Our experiment compares five architectures, each representing a different approach to handling rotation.
    </p>

    <h3 id="fm-framework"><span class="header-num">9.1</span> Mathematical Framework</h3>

    <p>
        Let \(G = C_4 = \{0^\circ, 90^\circ, 180^\circ, 270^\circ\}\) be the cyclic group of order 4. The group acts on images via rotation: \(g \cdot x\) rotates image \(x\) by angle \(g\). The fundamental objects in our models:
    </p>

    <p>
        <strong>Scalar field</strong>: A function \(f: \mathbb{R}^2 \to \mathbb{R}^C\), like a standard feature map \((B, C, H, W)\).
    </p>

    <p>
        <strong>Group field</strong>: A function \(f: G \times \mathbb{R}^2 \to \mathbb{R}^C\), a collection of feature maps indexed by group elements \((B, C, G, H, W)\). Each slice \(f(g)\) contains features extracted at orientation \(g\).
    </p>

    <p>
        <strong>Equivariance guarantee</strong>: If all layers satisfy \(f(g \cdot x) = g \cdot f(x)\), then the entire network does:
    </p>

    <div class="equation">
        \[
        \text{Network}(g \cdot x) = g \cdot \text{Network}(x)
        \]
    </div>

    <p>
        <strong>Invariance via group pooling</strong>: A function \(F\) is invariant if \(F(g \cdot x) = F(x)\) for all \(g \in G\). This is achieved by pooling over the group dimension:
    </p>

    <div class="equation">
        \[
        \text{GroupPool}(f) = \frac{1}{|G|} \sum_{g \in G} f(g) \quad \Rightarrow \quad \text{GroupPool}(g \cdot f) = \text{GroupPool}(f)
        \]
    </div>

    <h3 id="fm-vanilla"><span class="header-num">9.2</span> Model 1: Vanilla CNN (No Augmentation)</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/model1.png' | relative_url }}" alt="Vanilla CNN architecture">
        <figcaption>Architecture of the Vanilla CNN baseline.</figcaption>
    </figure>

    <p>
        Standard convolution is <strong>equivariant to translation</strong> but not to rotation. For a standard conv kernel \(w\):
    </p>

    <div class="equation">
        \[
        [\text{Conv}(x)]_{i,j} = \sum_{m,n} w_{m,n} \cdot x_{i+m, \, j+n}
        \]
    </div>

    <p>
        This satisfies \(\text{Conv}(T_{(a,b)} \cdot x) = T_{(a,b)} \cdot \text{Conv}(x)\) for translations \(T_{(a,b)}\), but <strong>not</strong> for rotations.
    </p>

    <p>
        MaxPool2d is <strong>not</strong> rotation-equivariant (a 2×2 rectangular window has no rotational symmetry). The FC layer is <strong>spatially blind</strong> (it destroys all spatial structure by flattening).
    </p>

    <p>
        <strong>Prediction</strong>: Will perform well on upright digits and fail on rotated ones.
    </p>

    <h3 id="fm-augmented"><span class="header-num">9.3</span> Model 2: Augmented CNN (Data Augmentation)</h3>

    <p>
        <strong>Architecture</strong>: Identical to Vanilla CNN (same layers, same parameters).
    </p>

    <p>
        <strong>Training difference</strong>: Each training image is randomly rotated by \(r \sim \text{Uniform}(0°, 360°)\):
    </p>

    <div class="equation">
        \[
        \tilde{x} = R_r \cdot x, \quad r \sim \text{Uniform}(0, 360)
        \]
    </div>

    <p>
        This does not change the network architecture. Instead, it changes the <strong>data distribution</strong> the network sees during training. The network learns features that are approximately rotation-invariant by exposure to all orientations.
    </p>

    <p>
        No architectural guarantee of equivariance or invariance. The network <strong>learns</strong> approximate invariance through SGD on augmented data.
    </p>

    <p>
        <strong>Prediction</strong>: Will learn to handle rotations through brute-force exposure.
    </p>

    <h3 id="fm-equiv"><span class="header-num">9.4</span> Model 3: Equiv-C4 (Equivariant CNN)</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/model3.png' | relative_url }}" alt="Equiv-C4 architecture">
        <figcaption>Architecture of the Equivariant CNN with group convolution layers.</figcaption>
    </figure>

    <p>
        Each layer implements the group convolution formula. For the first layer, the scalar field \(x\) is converted to a group field:
    </p>

    <div class="equation">
        \[
        [\text{Conv}_1(x)]_{g} = \text{Conv2d}(x, \, R_g[\psi_1]) \quad \text{for } g \in \{0°, 90°, 180°, 270°\}
        \]
    </div>

    <p>
        For subsequent layers:
    </p>

    <div class="equation">
        \[
        [\text{Conv}_\ell(x)]_{g_{out}} = \sum_{g_{in} \in G} \text{Conv2d}\big(x_{g_{in}}, \, R_{g_{in}}[\psi_\ell^{(g_{in} \cdot g_{out}^{-1})}]\big)
        \]
    </div>

    <p>
        <strong>Output</strong>: \((B, 10, 4)\), 10 class logits at each of 4 group elements. At inference, mean over \(G\) gives the final prediction.
    </p>

    <h3 id="fm-inv"><span class="header-num">9.5</span> Model 4: Inv-C4 (Invariant CNN)</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/model4.png' | relative_url }}" alt="Inv-C4 architecture">
        <figcaption>Architecture of the Invariant CNN with group pooling for rotation invariance.</figcaption>
    </figure>

    <p>
        The first three layers are identical to Equiv-C4. They produce an equivariant group field. The key difference is the <strong>group pooling</strong> step:
    </p>

    <div class="equation">
        \[
        [\text{GroupPool}(x)]_{c, h, w} = \frac{1}{|G|} \sum_{g \in G} x_{c, g, h, w}
        \]
    </div>

    <p>
        This collapses the group dimension, producing a <strong>scalar field</strong> \((B, 64, 28, 28)\) that is invariant to rotation.
    </p>

    <p>
        <strong>The 6 vs 9 tradeoff</strong>: Since \(\text{InvCNN}(R_{180°} \cdot 6) = \text{InvCNN}(6)\) and \(R_{180°} \cdot 6 = 9\), the model must predict the same class for both 6 and 9. It learns a prior toward 9 (more common digit).
    </p>

    <h3 id="fm-pool"><span class="header-num">9.6</span> Model 5: Vanilla+Pool (Brute-Force Invariance)</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/model5.png' | relative_url }}" alt="Vanilla+Pool architecture">
        <figcaption>Architecture of the Vanilla+Pool model using orbit aggregation for invariance.</figcaption>
    </figure>

    <p>
        This model achieves invariance by <strong>orbit aggregation</strong>, processing all group-transformed copies of the input and averaging:
    </p>

    <div class="equation">
        \[
        \text{VanillaPool}(x) = \frac{1}{|G|} \sum_{g \in G} f(R_g \cdot x)
        \]
    </div>

    <p>
        <strong>No equivariant layers needed</strong>: Unlike Inv-C4, the backbone uses standard <code>Conv2d</code> with no group dimensions and no weight-sharing constraints. Invariance is achieved entirely at the output by averaging over the orbit.
    </p>

    <p>
        <strong>Tradeoff</strong>: This requires \(|G|\) forward passes per input (4× slower at inference), but the backbone is simpler and easier to train (33K vs 102K params, standard convolutions).
    </p>

    <h3 id="fm-comparison"><span class="header-num">9.7</span> Comparison Summary</h3>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Backbone</th>
                    <th>Invariance Mechanism</th>
                    <th>Equivariant Layers</th>
                    <th>Output</th>
                    <th>Params</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Vanilla CNN</td>
                    <td>Standard Conv + MaxPool + FC</td>
                    <td>None</td>
                    <td>No</td>
                    <td>\((B, 10)\)</td>
                    <td>156K</td>
                </tr>
                <tr>
                    <td>Augmented CNN</td>
                    <td>Same as Vanilla</td>
                    <td>Training augmentation</td>
                    <td>No</td>
                    <td>\((B, 10)\)</td>
                    <td>156K</td>
                </tr>
                <tr>
                    <td>Equiv-C4</td>
                    <td>Group Conv + GEquivBN</td>
                    <td>None (output is equivariant)</td>
                    <td>Yes</td>
                    <td>\((B, 10, G)\)</td>
                    <td>112K</td>
                </tr>
                <tr>
                    <td>Inv-C4</td>
                    <td>Group Conv + GEquivBN</td>
                    <td>Group pooling</td>
                    <td>Yes → then standard</td>
                    <td>\((B, 10)\)</td>
                    <td>102K</td>
                </tr>
                <tr>
                    <td>Vanilla+Pool</td>
                    <td>Standard Conv (no group)</td>
                    <td>Orbit aggregation</td>
                    <td>No</td>
                    <td>\((B, 10)\)</td>
                    <td>33K</td>
                </tr>
            </tbody>
        </table>
    </div>

    <p>
        <strong>The key distinction</strong>: Equiv-C4 and Inv-C4 use equivariant layers (group convolutions) in the backbone. Vanilla+Pool uses standard layers but achieves invariance by brute-force orbit aggregation. The question we test: does the equivariant backbone matter for the invariant model's performance?
    </p>

    <h2 id="results"><span class="header-num">10</span> Results</h2>

    <p>
        We trained and evaluated all 5 models on <strong>Rotated MNIST</strong> (70,000 handwritten digit images, 0-9, 28×28 grayscale). Each model is evaluated at 12 rotation angles (0°, 30°, 60°, ..., 330°) to measure how accuracy changes with rotation.
    </p>

    <h3 id="results-accuracy"><span class="header-num">10.1</span> Accuracy at 0° vs 90°</h3>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>0° Accuracy</th>
                    <th>90° Accuracy</th>
                    <th>Drop</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Vanilla CNN</td>
                    <td>99.2%</td>
                    <td>15.4%</td>
                    <td>-84%</td>
                </tr>
                <tr>
                    <td>Augmented CNN</td>
                    <td>94.2%</td>
                    <td>93.6%</td>
                    <td>-0.6%</td>
                </tr>
                <tr>
                    <td>Equiv-C4</td>
                    <td>27.3%</td>
                    <td>27.3%</td>
                    <td><strong>0%</strong></td>
                </tr>
                <tr>
                    <td>Inv-C4</td>
                    <td>66.0%</td>
                    <td>66.0%</td>
                    <td><strong>0%</strong></td>
                </tr>
                <tr>
                    <td>Vanilla+Pool</td>
                    <td>70.9%</td>
                    <td>70.9%</td>
                    <td><strong>0%</strong></td>
                </tr>
            </tbody>
        </table>
    </div>

    <h3 id="results-angle"><span class="header-num">10.2</span> Full Angle Curve</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/accuracy_vs_angle_mnist.png' | relative_url }}" alt="Accuracy vs rotation angle for all five models">
        <figcaption>Accuracy across rotation angles. The Vanilla CNN peaks at 0° and collapses elsewhere. The equivariant models show perfect C4 periodicity.</figcaption>
    </figure>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/training_curves_mnist.png' | relative_url }}" alt="Training curves for all models">
        <figcaption>Training loss and accuracy curves. The equivariant models converge more slowly due to the harder optimization landscape.</figcaption>
    </figure>

    <p>
        The accuracy-vs-angle plot tells a clear story:
    </p>

    <ul>
        <li><strong>Vanilla CNN</strong>: A sharp peak at 0° that collapses at all other angles. The network learned "upright digits" and nothing else.</li>
        <li><strong>Augmented CNN</strong>: A nearly flat line at ~94%. Data augmentation is remarkably effective.</li>
        <li><strong>Equiv-C4 and Inv-C4</strong>: Perfectly flat at their respective accuracy levels across all C4-symmetric angles (0°, 90°, 180°, 270°), with slightly lower values at 45° offsets (which C4 does not contain). The equivariance property is working correctly.</li>
    </ul>

    <p>
        The Equiv-C4 model's lower accuracy (~27%) is a training issue, not an architecture failure. 20 epochs on randomly rotated digits is insufficient for this small model.
    </p>

    <h2 id="six-vs-nine"><span class="header-num">11</span> The 6 vs 9 Problem</h2>

    <p>
        This is the most revealing result. We measured accuracy separately for digits 6 and 9 at 0° and 180°:
    </p>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>6 at 0°</th>
                    <th>6 at 180°</th>
                    <th>9 at 0°</th>
                    <th>9 at 180°</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Vanilla CNN</td>
                    <td>~99%</td>
                    <td><strong>~0%</strong></td>
                    <td>~99%</td>
                    <td><strong>~0%</strong></td>
                </tr>
                <tr>
                    <td>Augmented CNN</td>
                    <td>~95%</td>
                    <td><strong>~95%</strong></td>
                    <td>~87%</td>
                    <td><strong>~88%</strong></td>
                </tr>
                <tr>
                    <td>Equiv-C4 (fixed)</td>
                    <td>~27%</td>
                    <td><strong>~27%</strong></td>
                    <td>~27%</td>
                    <td><strong>~27%</strong></td>
                </tr>
                <tr>
                    <td>Inv-C4 (fixed)</td>
                    <td>~19%</td>
                    <td><strong>~20%</strong></td>
                    <td>~67%</td>
                    <td><strong>~67%</strong></td>
                </tr>
                <tr>
                    <td>Vanilla+Pool</td>
                    <td>~71%</td>
                    <td><strong>~71%</strong></td>
                    <td>~71%</td>
                    <td><strong>~71%</strong></td>
                </tr>
            </tbody>
        </table>
    </div>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/per_digit_6_9.png' | relative_url }}" alt="Per-digit accuracy for 6 and 9 across rotation angles">
        <figcaption>The 6 vs 9 problem. The invariant CNN predicts the same class for all orientations, forcing it to choose between 6 and 9.</figcaption>
    </figure>

    <p>
        A rotated 6 looks like a 9. A rotated 9 looks like a 6. The Vanilla CNN classifies them wrong at 180°. The Augmented CNN handles this correctly because it was trained on rotated images.
    </p>

    <p>
        The fixed <strong>Invariant CNN</strong> shows the 6 vs 9 tradeoff clearly: it predicts the same class for all orientations of a digit (invariant by design), but this means it must choose between 6 and 9. The model learns a bias toward 9 (the more common digit at upright orientation), so digit 6 is frequently misclassified as 9.
    </p>

    <h2 id="postmortem"><span class="header-num">12</span> Why our equivariant CNN failed to perform well?</h2>

    <p>
        Our group convolution implementation has the correct weight-sharing constraint. Kernels are rotated and shared across groups. But <strong>four separate operations break exact equivariance</strong>:
    </p>

    <h3 id="pm-pooling"><span class="header-num">12.1</span> Failure 1: Max Pooling is Not Rotation-Equivariant</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/fail1.png' | relative_url }}" alt="Max pooling breaks rotation equivariance">
        <figcaption>Max pooling with a rectangular window does not commute with rotation.</figcaption>
    </figure>

    <p>
        A 2×2 rectangular pooling window is not rotationally symmetric. Proper equivariant networks use circular pooling windows or avoid pooling entirely (using strided convolutions instead).
    </p>

    <h3 id="pm-bn"><span class="header-num">12.2</span> Failure 2: Batch Normalization Destroys Group Structure</h3>

    <pre><code class="language-python">class GroupBatchNorm2d(nn.Module):
    def forward(self, x):
        x_merged = x.permute(0, 2, 1, 3, 4).reshape(B * G, C, H, W)
        x_merged = self.bn(x_merged)  # ← independent per (c, g) pair</code></pre>

    <p>
        Our <code>GroupBatchNorm2d</code> normalizes each channel-group combination independently. But features at group \(g=0\) and features at group \(g=2\) have different statistics. Normalizing them independently breaks the relationship that the convolution established.
    </p>

    <h3 id="pm-fc"><span class="header-num">12.3</span> Failure 3: The FC Classifier is Spatially Blind</h3>

    <p>
        After the group convolution layers, features at different group indices are <strong>rotated versions</strong> of each other. When flattened, the FC layer applies the same weights to both vectors, but the same weight \(w_{0,0}\) now multiplies a completely different feature. The FC layer has no spatial awareness.
    </p>

    <h3 id="pm-data"><span class="header-num">12.4</span> Failure 4: Trained Only on Unrotated Data</h3>

    <p>
        Groups \(g=1, 2, 3\) extract features using rotated kernels applied to <strong>unrotated images</strong>. The features they produce are less informative than \(g=0\)'s features. During training, the loss is averaged across all four groups, and groups 1, 2, and 3 contribute weaker gradients. The network learns to rely primarily on group 0, and the equivariant structure atrophies.
    </p>

    <h3 id="pm-results"><span class="header-num">12.5</span> Results</h3>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/equivariance_error.png' | relative_url }}" alt="Equivariance error before and after fixes">
        <figcaption>Equivariance error dropped from ~0.3 to ~10⁻⁶ after fixing all breaks.</figcaption>
    </figure>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Model</th>
                    <th>0° Acc</th>
                    <th>90° Acc</th>
                    <th>Equivariance Error</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Vanilla CNN</td>
                    <td>99.2%</td>
                    <td>15.4%</td>
                    <td>N/A (not equivariant)</td>
                </tr>
                <tr>
                    <td>Augmented CNN</td>
                    <td>94.2%</td>
                    <td>93.6%</td>
                    <td>N/A (data augmentation)</td>
                </tr>
                <tr>
                    <td>Equiv-C4</td>
                    <td>27.3%</td>
                    <td>27.3%</td>
                    <td><strong>~1×10⁻⁶</strong></td>
                </tr>
                <tr>
                    <td>Inv-C4</td>
                    <td>66.0%</td>
                    <td>66.0%</td>
                    <td><strong>~2×10⁻⁶</strong></td>
                </tr>
                <tr>
                    <td>Vanilla+Pool</td>
                    <td>70.9%</td>
                    <td>70.9%</td>
                    <td><strong>0</strong> (perfect invariance)</td>
                </tr>
            </tbody>
        </table>
    </div>

    <p>
        The fixed equivariant models now show <strong>perfect C4 periodicity</strong>: identical accuracy at 0°, 90°, 180°, 270°. The lower absolute accuracy is a training issue (20 epochs on augmented data with these small models is insufficient for convergence), but the <strong>equivariance property is provably correct</strong>.
    </p>

    <h2 id="takeaways"><span class="header-num">13</span> Key Takeaways</h2>

    <figure>
        <img src="{{ '/assets/images/geometric-deep-learning/orbit_pca.png' | relative_url }}" alt="PCA visualization of feature orbits">
        <figcaption>PCA orbit analysis showing how features cluster by rotation.</figcaption>
    </figure>

    <h3 id="takeaways-learned"><span class="header-num">13.1</span> What We Learned</h3>

    <ol>
        <li><strong>Standard CNNs are rotation-blind.</strong> Vanilla CNN accuracy drops from 99% to 15% when digits are rotated by 90°. This is a real problem.</li>
        <li><strong>Data augmentation is remarkably effective.</strong> The Augmented CNN maintained ~94% accuracy at all rotation angles. Simple, practical, and it works.</li>
        <li><strong>Architecture alone is not enough.</strong> Our group convolution implementation had the correct weight-sharing constraint, but still failed because pooling, normalization, the classifier head, and the training data all broke equivariance.</li>
        <li><strong>Brute-force invariance works but is expensive.</strong> Vanilla+Pool achieves perfect rotation invariance (70.9% at all angles) using standard convolutions, no equivariant layers needed. But it requires \(|G|\) forward passes per input (4× slower inference).</li>
        <li><strong>Equivariant layers don't help the invariant model.</strong> Inv-C4 (66%) uses equivariant backbone + group pooling, while Vanilla+Pool (70.9%) uses standard backbone + orbit aggregation. The simpler approach wins.</li>
        <li><strong>The 6 vs 9 problem exposes the invariance-equivariance tradeoff.</strong> Full invariance makes 6 and 9 indistinguishable at 180°.</li>
        <li><strong>Every layer matters.</strong> In equivariant networks, the symmetry must be respected by convolution, pooling, normalization, training data, and the classifier. Breaking it anywhere breaks it everywhere.</li>
        <li><strong>Exact equivariance is verifiable.</strong> After fixing all breaks, the equivariance error dropped from ~0.3 to ~1×10⁻⁶, essentially floating-point precision.</li>
    </ol>

    <h3 id="takeaways-intuition"><span class="header-num">13.2</span> Correcting Our Intuition</h3>

    <p>
        Before this project, we might have thought:
    </p>

    <blockquote>
        <p>"Group convolution = rotation equivariance = done."</p>
    </blockquote>

    <p>
        Now we know:
    </p>

    <blockquote>
        <p>"Group convolution = the <em>convolution part</em> is equivariant. But the network also has pooling, normalization, nonlinearities, and a classifier. Each of these must be individually designed to respect the group. Getting one right is easy. Getting them all right is the hard part."</p>
    </blockquote>

    <p><em>All experiments run on NVIDIA RTX 3050 (4GB VRAM) with PyTorch 2.6 + CUDA 12.4.</em></p>
</section>
