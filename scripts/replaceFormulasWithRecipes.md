### How to Use the Script

1.**Save the Code:** Save the code above into a filenamed `replaceFormulasWithRecipes.js`.

2.**Make it Executable (Optional but Recommended on Linux/macOS):**

Openyourterminalandrun:

```bash

    chmod +x replaceFormulasWithRecipes.js

```

3.**Run it:** You can now run the script in several ways from your terminal.

**Option 1: UsingaPipe (`|`)**

    This is the most common method. You canuse`echo`for a single line or `cat` for a file.

    *   With`echo`:

    ```bash

    echo "Please review Formula No. 123a and No. 45." | node replaceFormulasWithRecipes.js

    ```

    **Output:**

    ```

    Please review Recipe 123a and Recipe 45.

    ```

    *   With a file:

    First, create a sample file`input.txt`:

    ```

    For this experiment, first consult Formula No. 101.

    Then, mix it with the contents from Formula 23a.

    Finally, add the catalyst from No. 45c as described.

    Do not use formula 99. The results of formula no. 102b were inconclusive.

    ```

    Now, run the script with the file as input:

    ```bash

    cat input.txt | node replaceFormulasWithRecipes.js

    ```

    **Option 2: Using Input Redirection (`<`)**

    This achieves the same resultas`cat`.

```bash

    node replaceFormulasWithRecipes.js < input.txt

```

**Option 3: InteractiveMode**

Youcanalsojustrunthescriptandtypedirectlyintotheterminal.

```bash

    node replaceFormulasWithRecipes.js

```

    Now start typing:

```

    I need Formula 50 and No. 60b.

```

    After you finish typing,press`Ctrl+D` (on Linux/macOS)or `Ctrl+Z`then `Enter` (on Windows) to signal the end of the input. The script will then print the processed output:

```

    I need Recipe 50 and Recipe 60b.

```
